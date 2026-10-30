import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import {
  sequelize, Sale, SaleItem, Payment, Product, Customer,
  StockMovement, Refund, RefundItem, Business, AuditLog
} from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

/**
 * Generate a collision-safe, unique invoice number: INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber(businessId, transaction) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Sale.count({
    where: {
      business_id: businessId,
      created_at: {
        [Op.gte]: new Date(today.getFullYear(), today.getMonth(), today.getDate())
      }
    },
    transaction
  });
  const seq = String(count + 1).padStart(4, '0');
  const candidate = `INV-${datePart}-${seq}`;
  const existing = await Sale.findOne({
    where: { business_id: businessId, invoice_number: candidate },
    transaction
  });
  if (existing) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${datePart}-${seq}-${randomSuffix}`;
  }
  return candidate;
}

/**
 * Generate a unique refund number: REF-YYYYMMDD-XXXX
 */
async function generateRefundNumber(businessId, transaction) {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Refund.count({
    where: {
      business_id: businessId,
      created_at: {
        [Op.gte]: new Date(today.getFullYear(), today.getMonth(), today.getDate())
      }
    },
    transaction
  });
  const seq = String(count + 1).padStart(4, '0');
  const candidate = `REF-${datePart}-${seq}`;
  const existing = await Refund.findOne({
    where: { business_id: businessId, refund_number: candidate },
    transaction
  });
  if (existing) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REF-${datePart}-${seq}-${randomSuffix}`;
  }
  return candidate;
}

export const saleController = {
  /**
   * POST /api/sales — Create a new sale (POS checkout)
   */
  create: async (req, res, next) => {
    try {
      const businessId = req.businessId;
      const {
        customer_id,
        items,
        order_discount = 0,
        payment_method = 'CASH',
        paid_amount = 0,
        notes = '',
        idempotency_key
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return apiResponse.error(res, 'At least one item is required', 400, 'VALIDATION_ERROR');
      }

      // Idempotency check: prevent duplicate transactions within 60s with same key or notes
      if (idempotency_key) {
        const recentDuplicate = await Sale.findOne({
          where: {
            business_id: businessId,
            notes: { [Op.like]: `%[idempotency:${idempotency_key}]%` }
          }
        });
        if (recentDuplicate) {
          const fullExisting = await Sale.findByPk(recentDuplicate.id, {
            include: [
              { model: SaleItem, as: 'items' },
              { model: Payment, as: 'payments' },
              { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email', 'state'] }
            ]
          });
          return apiResponse.success(res, { sale: fullExisting }, 'Sale already processed (idempotent)', 200);
        }
      }

      const result = await sequelize.transaction(async (t) => {
        // Fetch business details for GST state comparison
        const business = await Business.findByPk(businessId, { transaction: t });
        const businessState = (business?.state || '').trim().toLowerCase();

        // Customer details if provided
        let customer = null;
        let isInterState = false;
        if (customer_id) {
          customer = await Customer.findOne({
            where: { id: customer_id, business_id: businessId },
            transaction: t
          });
          if (!customer) {
            throw Object.assign(new Error(`Customer ${customer_id} not found in this business`), {
              statusCode: 404,
              code: 'NOT_FOUND'
            });
          }
          if (customer.state && businessState && customer.state.trim().toLowerCase() !== businessState) {
            isInterState = true;
          }
        }

        // Lock products in ascending order to prevent deadlocks
        const rawProductIds = items.map((i) => i.product_id);
        const sortedProductIds = [...new Set(rawProductIds)].sort((a, b) => a - b);

        const products = await Product.findAll({
          where: { id: { [Op.in]: sortedProductIds }, business_id: businessId },
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        const productMap = {};
        for (const p of products) productMap[p.id] = p;

        let subtotal = new Decimal(0);
        let discountTotal = new Decimal(0);
        let taxTotal = new Decimal(0);
        let cgstTotal = new Decimal(0);
        let sgstTotal = new Decimal(0);
        let igstTotal = new Decimal(0);

        const saleItemsData = [];

        for (const item of items) {
          const product = productMap[item.product_id];
          if (!product) {
            throw Object.assign(new Error(`Product ${item.product_id} not found`), {
              statusCode: 404,
              code: 'NOT_FOUND'
            });
          }
          if (!product.is_active) {
            throw Object.assign(new Error(`Product "${product.name}" is inactive`), {
              statusCode: 422,
              code: 'PRODUCT_INACTIVE'
            });
          }
          if (item.quantity <= 0) {
            throw Object.assign(new Error(`Item quantity must be greater than zero`), {
              statusCode: 400,
              code: 'INVALID_QUANTITY'
            });
          }
          if (product.quantity < item.quantity) {
            throw Object.assign(
              new Error(`Insufficient stock for "${product.name}". Available: ${product.quantity}`),
              { statusCode: 422, code: 'INSUFFICIENT_STOCK' }
            );
          }

          const qty = new Decimal(item.quantity);
          const unitSellingPrice = new Decimal(item.unit_price !== undefined ? item.unit_price : product.selling_price);
          const unitCostPrice = new Decimal(product.cost_price || 0);
          const discPct = new Decimal(item.discount_percent || 0);

          const lineGross = qty.mul(unitSellingPrice);
          const lineDiscount = lineGross.mul(discPct).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const lineTaxable = lineGross.minus(lineDiscount);

          const taxRate = new Decimal(product.tax_rate || 0);
          const lineTax = lineTaxable.mul(taxRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const lineTotal = lineTaxable.plus(lineTax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

          let lineCgst = new Decimal(0);
          let lineSgst = new Decimal(0);
          let lineIgst = new Decimal(0);

          if (isInterState) {
            lineIgst = lineTax;
          } else {
            lineCgst = lineTax.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            lineSgst = lineTax.minus(lineCgst);
          }

          subtotal = subtotal.plus(lineGross);
          discountTotal = discountTotal.plus(lineDiscount);
          taxTotal = taxTotal.plus(lineTax);
          cgstTotal = cgstTotal.plus(lineCgst);
          sgstTotal = sgstTotal.plus(lineSgst);
          igstTotal = igstTotal.plus(lineIgst);

          saleItemsData.push({
            business_id: businessId,
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            unit_cost_price: unitCostPrice.toFixed(2),
            unit_selling_price: unitSellingPrice.toFixed(2),
            quantity: item.quantity,
            refunded_quantity: 0,
            discount_percentage: discPct.toFixed(2),
            discount_amount: lineDiscount.toFixed(2),
            taxable_amount: lineTaxable.toFixed(2),
            tax_rate: taxRate.toFixed(2),
            cgst_amount: lineCgst.toFixed(2),
            sgst_amount: lineSgst.toFixed(2),
            igst_amount: lineIgst.toFixed(2),
            tax_amount: lineTax.toFixed(2),
            line_total: lineTotal.toFixed(2)
          });

          // Deduct stock inside transaction and log immutable StockMovement
          const prevQty = product.quantity;
          const newQty = prevQty - item.quantity;
          await product.update({ quantity: newQty }, { transaction: t });

          await StockMovement.create(
            {
              business_id: businessId,
              product_id: product.id,
              user_id: req.user.id,
              type: 'SALE',
              quantity_change: -item.quantity,
              previous_quantity: prevQty,
              new_quantity: newQty,
              reference_id: null,
              notes: `POS Sale`
            },
            { transaction: t }
          );
        }

        // Order-level discount
        const orderDisc = new Decimal(order_discount || 0);
        discountTotal = discountTotal.plus(orderDisc);

        // Final Calculations
        const rawGrandTotal = subtotal.minus(discountTotal).plus(taxTotal);
        const roundedTotal = rawGrandTotal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
        const roundOff = roundedTotal.minus(rawGrandTotal).toDecimalPlaces(2);
        const grandTotal = Decimal.max(0, roundedTotal);

        const paid = new Decimal(paid_amount || 0);
        const balanceDue = Decimal.max(0, grandTotal.minus(paid)).toDecimalPlaces(2);

        let paymentStatus = 'UNPAID';
        if (paid.gte(grandTotal) && grandTotal.gt(0)) paymentStatus = 'PAID';
        else if (paid.gt(0)) paymentStatus = 'PARTIALLY_PAID';

        const invoiceNumber = await generateInvoiceNumber(businessId, t);
        const formattedNotes = idempotency_key
          ? `${notes || ''} [idempotency:${idempotency_key}]`.trim()
          : notes;

        // Create Sale Record
        const sale = await Sale.create(
          {
            business_id: businessId,
            customer_id: customer_id || null,
            user_id: req.user.id,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().slice(0, 10),
            subtotal: subtotal.toFixed(2),
            discount_total: discountTotal.toFixed(2),
            order_discount: orderDisc.toFixed(2),
            tax_total: taxTotal.toFixed(2),
            cgst_total: cgstTotal.toFixed(2),
            sgst_total: sgstTotal.toFixed(2),
            igst_total: igstTotal.toFixed(2),
            round_off: roundOff.toFixed(2),
            grand_total: grandTotal.toFixed(2),
            paid_amount: Decimal.min(paid, grandTotal).toFixed(2),
            refunded_amount: '0.00',
            balance_due: balanceDue.toFixed(2),
            payment_status: paymentStatus,
            status: 'COMPLETED',
            notes: formattedNotes
          },
          { transaction: t }
        );

        // Associate sale_id and bulk create items
        for (const si of saleItemsData) {
          si.sale_id = sale.id;
        }
        await SaleItem.bulkCreate(saleItemsData, { transaction: t });

        // Create Payment record if paid amount > 0
        if (paid.gt(0)) {
          const acceptedMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];
          const validMethod = acceptedMethods.includes(payment_method) ? payment_method : 'CASH';

          await Payment.create(
            {
              business_id: businessId,
              sale_id: sale.id,
              amount: Decimal.min(paid, grandTotal).toFixed(2),
              payment_method: validMethod,
              reference_number: null,
              payment_date: new Date(),
              notes: `Initial payment for ${invoiceNumber}`
            },
            { transaction: t }
          );
        }

        // Update customer outstanding balance if balance due > 0
        if (customer && balanceDue.gt(0)) {
          await customer.increment('outstanding_balance', {
            by: balanceDue.toNumber(),
            transaction: t
          });
        }

        // Log audit trail
        await AuditLog.create(
          {
            business_id: businessId,
            user_id: req.user.id,
            action: 'SALE_CREATE',
            entity: 'Sale',
            entity_id: String(sale.id),
            changes: {
              invoice_number: invoiceNumber,
              grand_total: grandTotal.toFixed(2),
              paid_amount: paid.toFixed(2),
              items_count: items.length
            },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return sale;
      });

      // Reload with full relations
      const fullSale = await Sale.findByPk(result.id, {
        include: [
          { model: SaleItem, as: 'items' },
          { model: Payment, as: 'payments' },
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email', 'tax_number', 'state'] }
        ]
      });

      return apiResponse.success(res, { sale: fullSale }, 'Sale created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/sales — List sales invoices with pagination & filters
   */
  list: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status,
        payment_status,
        customer_id,
        date_from,
        date_to
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where = { business_id: req.businessId };

      if (search) where.invoice_number = { [Op.like]: `%${search}%` };
      if (status) where.status = status;
      if (payment_status) where.payment_status = payment_status;
      if (customer_id) where.customer_id = customer_id;
      if (date_from || date_to) {
        where.invoice_date = {};
        if (date_from) where.invoice_date[Op.gte] = date_from;
        if (date_to) where.invoice_date[Op.lte] = date_to;
      }

      const { rows, count } = await Sale.findAndCountAll({
        where,
        include: [
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email'] },
          { model: Payment, as: 'payments', attributes: ['id', 'amount', 'payment_method', 'payment_date'] }
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset
      });

      return apiResponse.success(res, { sales: rows }, 'Sales retrieved', 200, {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/sales/:id — Single invoice details
   */
  getById: async (req, res, next) => {
    try {
      const sale = await Sale.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          { model: SaleItem, as: 'items' },
          { model: Payment, as: 'payments' },
          { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'email', 'tax_number', 'state', 'address'] },
          { model: Refund, as: 'refunds', include: [{ model: RefundItem, as: 'items' }] }
        ]
      });
      if (!sale) return apiResponse.error(res, 'Sale not found', 404, 'NOT_FOUND');
      return apiResponse.success(res, { sale }, 'Sale retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/sales/:id/payments — Add payment to existing invoice
   */
  addPayment: async (req, res, next) => {
    try {
      const { amount, method = 'CASH', reference_number, notes } = req.body;
      const payAmount = new Decimal(amount || 0);
      if (payAmount.lte(0)) {
        return apiResponse.error(res, 'Payment amount must be greater than zero', 400, 'VALIDATION_ERROR');
      }

      const acceptedMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'OTHER'];
      const paymentMethod = acceptedMethods.includes(method) ? method : 'CASH';

      const result = await sequelize.transaction(async (t) => {
        const sale = await Sale.findOne({
          where: { id: req.params.id, business_id: req.businessId },
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        if (!sale) throw Object.assign(new Error('Sale not found'), { statusCode: 404, code: 'NOT_FOUND' });
        if (sale.payment_status === 'PAID') {
          throw Object.assign(new Error('Invoice is already fully paid'), { statusCode: 422, code: 'ALREADY_PAID' });
        }

        const balanceDue = new Decimal(sale.balance_due);
        if (payAmount.gt(balanceDue)) {
          throw Object.assign(
            new Error(`Payment amount (${payAmount.toFixed(2)}) exceeds balance due (${balanceDue.toFixed(2)})`),
            { statusCode: 422, code: 'EXCEEDS_BALANCE' }
          );
        }

        const payment = await Payment.create(
          {
            business_id: req.businessId,
            sale_id: sale.id,
            amount: payAmount.toFixed(2),
            payment_method: paymentMethod,
            reference_number: reference_number || null,
            payment_date: new Date(),
            notes: notes || `Payment against ${sale.invoice_number}`
          },
          { transaction: t }
        );

        const newPaid = new Decimal(sale.paid_amount).plus(payAmount);
        const grandTotal = new Decimal(sale.grand_total);
        const newBalance = Decimal.max(0, grandTotal.minus(newPaid)).toDecimalPlaces(2);
        const newStatus = newBalance.lte(0) ? 'PAID' : 'PARTIALLY_PAID';

        await sale.update(
          {
            paid_amount: newPaid.toFixed(2),
            balance_due: newBalance.toFixed(2),
            payment_status: newStatus
          },
          { transaction: t }
        );

        // Decrement customer outstanding balance
        if (sale.customer_id) {
          const customer = await Customer.findByPk(sale.customer_id, { transaction: t });
          if (customer) {
            const deduct = Decimal.min(payAmount, new Decimal(customer.outstanding_balance));
            if (deduct.gt(0)) {
              await customer.decrement('outstanding_balance', { by: deduct.toNumber(), transaction: t });
            }
          }
        }

        await AuditLog.create(
          {
            business_id: req.businessId,
            user_id: req.user.id,
            action: 'PAYMENT_ADD',
            entity: 'Payment',
            entity_id: String(payment.id),
            changes: {
              sale_id: sale.id,
              amount: payAmount.toFixed(2),
              payment_method: paymentMethod,
              remaining_balance: newBalance.toFixed(2)
            },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return { sale, payment };
      });

      return apiResponse.success(res, result, 'Payment recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/sales/:id/refund — Process refund / returns
   */
  refund: async (req, res, next) => {
    try {
      const { items, reason, refund_method = 'CASH', notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return apiResponse.error(res, 'Refund items are required', 400, 'VALIDATION_ERROR');
      }

      const result = await sequelize.transaction(async (t) => {
        const sale = await Sale.findOne({
          where: { id: req.params.id, business_id: req.businessId },
          include: [{ model: SaleItem, as: 'items' }],
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        if (!sale) throw Object.assign(new Error('Sale not found'), { statusCode: 404, code: 'NOT_FOUND' });
        if (sale.status === 'REFUNDED') throw Object.assign(new Error('Sale is already fully refunded'), { statusCode: 422, code: 'ALREADY_REFUNDED' });
        if (sale.status === 'CANCELLED') throw Object.assign(new Error('Cannot refund a cancelled sale'), { statusCode: 422, code: 'CANCELLED' });

        const saleItemMap = {};
        for (const si of sale.items) saleItemMap[si.id] = si;

        let totalSubtotalRefunded = new Decimal(0);
        let totalTaxRefunded = new Decimal(0);
        let totalRefundAmount = new Decimal(0);
        const refundItemsData = [];

        for (const ri of items) {
          const si = saleItemMap[ri.sale_item_id];
          if (!si) throw Object.assign(new Error(`Sale item ${ri.sale_item_id} not found in this sale`), { statusCode: 404, code: 'NOT_FOUND' });

          const returnQty = parseInt(ri.quantity, 10);
          if (isNaN(returnQty) || returnQty <= 0) {
            throw Object.assign(new Error('Return quantity must be greater than zero'), { statusCode: 400, code: 'INVALID_QUANTITY' });
          }

          const maxQty = si.quantity - (si.refunded_quantity || 0);
          if (returnQty > maxQty) {
            throw Object.assign(
              new Error(`Cannot refund ${returnQty} of "${si.product_name}". Max refundable: ${maxQty}`),
              { statusCode: 422, code: 'REFUND_EXCEEDS_QUANTITY' }
            );
          }

          // Fractional calculations for this item
          const unitPrice = new Decimal(si.unit_selling_price);
          const taxRate = new Decimal(si.tax_rate || 0);
          const lineTaxable = unitPrice.mul(returnQty);
          const lineTax = lineTaxable.mul(taxRate).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
          const lineTotal = lineTaxable.plus(lineTax).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

          totalSubtotalRefunded = totalSubtotalRefunded.plus(lineTaxable);
          totalTaxRefunded = totalTaxRefunded.plus(lineTax);
          totalRefundAmount = totalRefundAmount.plus(lineTotal);

          // Update refunded_quantity on SaleItem
          await si.increment('refunded_quantity', { by: returnQty, transaction: t });

          refundItemsData.push({
            business_id: req.businessId,
            product_id: si.product_id,
            sale_item_id: si.id,
            quantity: returnQty,
            unit_selling_price: unitPrice.toFixed(2),
            tax_rate: taxRate.toFixed(2),
            tax_amount: lineTax.toFixed(2),
            total_amount: lineTotal.toFixed(2),
            restock: ri.restock !== false
          });

          // Restore product inventory and log stock movement if restock is enabled
          if (ri.restock !== false) {
            const product = await Product.findByPk(si.product_id, { lock: t.LOCK.UPDATE, transaction: t });
            if (product) {
              const qBefore = product.quantity;
              const qAfter = qBefore + returnQty;
              await product.update({ quantity: qAfter }, { transaction: t });

              await StockMovement.create(
                {
                  business_id: req.businessId,
                  product_id: product.id,
                  user_id: req.user.id,
                  type: 'RETURN',
                  quantity_change: returnQty,
                  previous_quantity: qBefore,
                  new_quantity: qAfter,
                  reference_id: sale.invoice_number,
                  notes: `Return refund for ${sale.invoice_number}`
                },
                { transaction: t }
              );
            }
          }
        }

        const refundNumber = await generateRefundNumber(req.businessId, t);
        const acceptedRefundMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'STORE_CREDIT', 'ADJUSTMENT'];
        const validRefundMethod = acceptedRefundMethods.includes(refund_method) ? refund_method : 'CASH';

        const refund = await Refund.create(
          {
            business_id: req.businessId,
            sale_id: sale.id,
            user_id: req.user.id,
            customer_id: sale.customer_id,
            refund_number: refundNumber,
            refund_date: new Date().toISOString().slice(0, 10),
            subtotal_refunded: totalSubtotalRefunded.toFixed(2),
            tax_refunded: totalTaxRefunded.toFixed(2),
            total_refunded: totalRefundAmount.toFixed(2),
            refund_method: validRefundMethod,
            reason: reason || 'Customer Return',
            notes: notes || null
          },
          { transaction: t }
        );

        for (const rid of refundItemsData) {
          rid.refund_id = refund.id;
        }
        await RefundItem.bulkCreate(refundItemsData, { transaction: t });

        // Update sale refunded_amount and status
        const newRefunded = new Decimal(sale.refunded_amount).plus(totalRefundAmount);
        const grandTotal = new Decimal(sale.grand_total);
        const newStatus = newRefunded.gte(grandTotal) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
        await sale.update(
          {
            refunded_amount: newRefunded.toFixed(2),
            status: newStatus
          },
          { transaction: t }
        );

        // If customer exists and refund method is STORE_CREDIT, increment store credit
        if (sale.customer_id && validRefundMethod === 'STORE_CREDIT') {
          const customer = await Customer.findByPk(sale.customer_id, { transaction: t });
          if (customer) {
            await customer.increment('store_credit', { by: totalRefundAmount.toNumber(), transaction: t });
          }
        }

        await AuditLog.create(
          {
            business_id: req.businessId,
            user_id: req.user.id,
            action: 'SALE_REFUND',
            entity: 'Refund',
            entity_id: String(refund.id),
            changes: {
              sale_id: sale.id,
              refund_number: refundNumber,
              total_refunded: totalRefundAmount.toFixed(2),
              items_refunded: items.length
            },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return { refund, total_refunded: totalRefundAmount.toFixed(2) };
      });

      return apiResponse.success(res, result, 'Refund processed successfully', 201);
    } catch (error) {
      next(error);
    }
  }
};
