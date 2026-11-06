import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import {
  sequelize, Sale, SaleItem, Payment, Product, Customer,
  StockMovement, Business, AuditLog, ProductUnit, Inventory, User
} from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

/**
 * Generate unique collision-safe invoice number: INV-YYYYMMDD-XXXX
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

export const invoiceController = {
  /**
   * GET /api/invoices — List wholesale invoices with filters & pagination
   */
  list: async (req, res, next) => {
    try {
      const businessId = req.businessId;
      const {
        page = 1,
        limit = 20,
        search = '',
        customer_id,
        payment_status,
        from_date,
        to_date,
        payment_mode
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;

      const where = { business_id: businessId };

      if (search && search.trim()) {
        const query = `%${search.trim()}%`;
        where[Op.or] = [
          { invoice_number: { [Op.like]: query } },
          { notes: { [Op.like]: query } }
        ];
      }

      if (customer_id) where.customer_id = customer_id;
      if (payment_status) where.payment_status = payment_status;
      if (payment_mode) where.payment_mode = payment_mode;

      if (from_date && to_date) {
        where.invoice_date = { [Op.between]: [from_date, to_date] };
      } else if (from_date) {
        where.invoice_date = { [Op.gte]: from_date };
      } else if (to_date) {
        where.invoice_date = { [Op.lte]: to_date };
      }

      const { count, rows } = await Sale.findAndCountAll({
        where,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'phone', 'customer_type', 'credit_limit', 'outstanding_balance']
          },
          {
            model: User,
            as: 'cashier',
            attributes: ['id', 'name', 'role']
          },
          {
            model: SaleItem,
            as: 'items'
          },
          {
            model: Payment,
            as: 'payments'
          }
        ],
        order: [['created_at', 'DESC']],
        limit: limitNum,
        offset
      });

      return apiResponse.success(
        res,
        { invoices: rows },
        'Invoices retrieved successfully',
        200,
        {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum)
        }
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/invoices/:id — Single wholesale invoice details for printing or viewing
   */
  getById: async (req, res, next) => {
    try {
      const invoice = await Sale.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: Customer,
            as: 'customer'
          },
          {
            model: User,
            as: 'cashier',
            attributes: ['id', 'name', 'role']
          },
          {
            model: SaleItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'barcode', 'sku', 'base_unit', 'tax_rate']
              }
            ]
          },
          {
            model: Payment,
            as: 'payments'
          },
          {
            model: Business,
            as: 'business',
            attributes: ['id', 'name', 'email', 'phone', 'address', 'tax_number', 'state', 'currency_code', 'currency_symbol']
          }
        ]
      });

      if (!invoice) {
        return apiResponse.error(res, 'Invoice not found', 404, 'NOT_FOUND');
      }

      if (invoice.payment_status === 'UNPAID') {
        const hasPending = (invoice.payments || []).some(
          (p) => p.notes && p.notes.includes('Pending Confirmation')
        );
        if (hasPending) {
          invoice.setDataValue('payment_status', 'PENDING_CONFIRMATION');
        }
      }

      return apiResponse.success(res, { invoice }, 'Invoice retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/invoices — Create Wholesale FMCG Invoice with multi-unit, batch deduction,
   * scheme free quantities, split payments, credit validation, and atomic transaction.
   */
  create: async (req, res, next) => {
    try {
      const businessId = req.businessId;
      const {
        customer_id,
        items,
        order_discount = 0,
        payment_mode = 'CASH', // 'CASH', 'UPI', 'CREDIT', 'SPLIT'
        payment_method = 'CASH',
        paid_amount = 0,
        payments = [], // Split tender payments array: [{ method: 'CASH', amount: 100 }, ...]
        notes,
        idempotency_key
      } = req.body;

      // 1. Validation of authenticated user & items
      if (!req.user || !req.user.id) {
        return apiResponse.error(res, 'Authentication required', 401, 'UNAUTHORIZED');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return apiResponse.error(res, 'Invoice must contain at least one product item', 400, 'EMPTY_INVOICE');
      }

      // Check idempotency if key supplied
      if (idempotency_key) {
        const recentDuplicate = await Sale.findOne({
          where: {
            business_id: businessId,
            notes: { [Op.like]: `%[idempotency:${idempotency_key}]%` }
          },
          include: [
            { model: SaleItem, as: 'items' },
            { model: Payment, as: 'payments' },
            { model: Customer, as: 'customer' }
          ]
        });
        if (recentDuplicate) {
          return apiResponse.success(res, { invoice: recentDuplicate }, 'Invoice already processed (idempotent)', 200);
        }
      }

      // Execute entire invoice generation atomically
      const result = await sequelize.transaction(async (t) => {
        // Business state for GST interstate vs intrastate calculations
        const business = await Business.findByPk(businessId, { transaction: t });
        const businessState = (business?.state || '').trim().toLowerCase();

        // 2. Validate customer details
        let customer = null;
        let isInterState = false;
        if (customer_id) {
          customer = await Customer.findOne({
            where: { id: customer_id, business_id: businessId },
            transaction: t,
            lock: t.LOCK.UPDATE
          });
          if (!customer) {
            throw Object.assign(new Error(`Customer ${customer_id} not found in this business`), {
              statusCode: 404,
              code: 'NOT_FOUND'
            });
          }
          if (customer.status === 'INACTIVE') {
            throw Object.assign(new Error(`Customer "${customer.name}" is inactive`), {
              statusCode: 422,
              code: 'CUSTOMER_INACTIVE'
            });
          }
          if (customer.state && businessState && customer.state.trim().toLowerCase() !== businessState) {
            isInterState = true;
          }
        }

        // 3. Lock Products in ascending order to prevent deadlocks under concurrent requests
        const productIds = items.map((i) => i.product_id);
        const sortedProductIds = [...new Set(productIds)].sort((a, b) => a - b);

        const products = await Product.findAll({
          where: { id: { [Op.in]: sortedProductIds }, business_id: businessId },
          include: [
            {
              model: ProductUnit,
              as: 'units'
            },
            {
              model: Inventory,
              as: 'batches'
            }
          ],
          lock: t.LOCK.UPDATE,
          transaction: t
        });

        const productMap = {};
        for (const p of products) {
          productMap[p.id] = p;
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        let subtotal = new Decimal(0);
        let itemDiscountTotal = new Decimal(0);
        let taxTotal = new Decimal(0);
        let cgstTotal = new Decimal(0);
        let sgstTotal = new Decimal(0);
        let igstTotal = new Decimal(0);

        const invoiceItemsData = [];
        const stockMovementsToCreate = [];

        // 4 & 5. Process each invoice item
        for (const item of items) {
          const product = productMap[item.product_id];
          if (!product) {
            throw Object.assign(new Error(`Product ID ${item.product_id} not found`), {
              statusCode: 404,
              code: 'PRODUCT_NOT_FOUND'
            });
          }
          if (!product.is_active || product.status === 'INACTIVE') {
            throw Object.assign(new Error(`Product "${product.name}" is inactive`), {
              statusCode: 422,
              code: 'PRODUCT_INACTIVE'
            });
          }

          const chargedQty = parseInt(item.quantity, 10);
          if (isNaN(chargedQty) || chargedQty <= 0) {
            throw Object.assign(new Error(`Quantity for "${product.name}" must be greater than zero`), {
              statusCode: 400,
              code: 'INVALID_QUANTITY'
            });
          }

          const freeQty = Math.max(0, parseInt(item.free_quantity, 10) || 0);
          const totalUnitsToDeduct = chargedQty + freeQty;

          // Unit resolution
          const requestedUnitName = (item.unit_name || product.base_unit || 'PCS').toUpperCase();
          let unitObj = (product.units || []).find(
            (u) => u.unit_name.toUpperCase() === requestedUnitName
          );

          // If unit not in DB, fallback to default packaging conversions
          let conversionFactor = 1;
          let defaultRetailPrice = parseFloat(product.selling_price) || 0;
          let defaultWholesalePrice = parseFloat(product.wholesale_price) || (defaultRetailPrice * 0.85);

          if (unitObj) {
            conversionFactor = parseFloat(unitObj.conversion_factor) || 1;
            defaultRetailPrice = parseFloat(unitObj.retail_price) || defaultRetailPrice;
            defaultWholesalePrice = parseFloat(unitObj.wholesale_price) || defaultWholesalePrice;
          } else {
            const pack = product.carton_pack_qty || 12;
            if (requestedUnitName === 'BOX') {
              conversionFactor = pack;
              defaultRetailPrice = defaultRetailPrice * pack;
              defaultWholesalePrice = defaultWholesalePrice * pack;
            } else if (requestedUnitName === 'CTN') {
              conversionFactor = pack * 10;
              defaultRetailPrice = defaultRetailPrice * pack * 10;
              defaultWholesalePrice = defaultWholesalePrice * pack * 9.5;
            }
          }

          // Total quantity in smallest base unit (e.g. PCS)
          const totalBaseQty = Math.round(totalUnitsToDeduct * conversionFactor);

          // Unit Price determination
          let finalUnitPrice;
          if (item.unit_price !== undefined && item.unit_price !== null && !isNaN(parseFloat(item.unit_price))) {
            finalUnitPrice = new Decimal(item.unit_price);
          } else if (
            (customer && (customer.customer_type === 'WHOLESALE' || customer.customer_type === 'BULK' || customer.customer_type === 'SUB_WHOLESALER')) ||
            item.pricing_mode === 'WHOLESALE'
          ) {
            finalUnitPrice = new Decimal(defaultWholesalePrice);
          } else {
            finalUnitPrice = new Decimal(defaultRetailPrice);
          }

          // Monetary calculations (Charged quantity only)
          const lineGross = new Decimal(chargedQty).mul(finalUnitPrice);
          const discPct = new Decimal(item.discount_percent || 0);
          let lineDiscount = lineGross.mul(discPct).div(100);
          if (item.discount_amount && parseFloat(item.discount_amount) > 0) {
            lineDiscount = new Decimal(item.discount_amount);
          }
          lineDiscount = lineDiscount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

          const lineTaxable = Decimal.max(0, lineGross.minus(lineDiscount));
          const taxRate = new Decimal(item.tax_rate !== undefined ? item.tax_rate : (product.tax_rate || 0));
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
          itemDiscountTotal = itemDiscountTotal.plus(lineDiscount);
          taxTotal = taxTotal.plus(lineTax);
          cgstTotal = cgstTotal.plus(lineCgst);
          sgstTotal = sgstTotal.plus(lineSgst);
          igstTotal = igstTotal.plus(lineIgst);

          // 6. Batch resolution & Stock verification (FIFO or requested batch)
          let selectedBatchNumber = item.batch_number ? String(item.batch_number).trim() : null;

          // Check batch availability if specified
          if (selectedBatchNumber) {
            const batchRecord = await Inventory.findOne({
              where: {
                business_id: businessId,
                product_id: product.id,
                batch_number: selectedBatchNumber
              },
              lock: t.LOCK.UPDATE,
              transaction: t
            });

            if (batchRecord) {
              if (batchRecord.expiry_date && batchRecord.expiry_date < todayStr) {
                throw Object.assign(
                  new Error(`Batch "${selectedBatchNumber}" for "${product.name}" expired on ${batchRecord.expiry_date}. Sales from expired batches are blocked.`),
                  { statusCode: 422, code: 'BATCH_EXPIRED' }
                );
              }

              if (batchRecord.stock_quantity < totalBaseQty) {
                throw Object.assign(
                  new Error(
                    `Insufficient stock in batch "${selectedBatchNumber}" for "${product.name}". Required: ${totalBaseQty} base PCS, Available: ${batchRecord.stock_quantity} base PCS.`
                  ),
                  { statusCode: 422, code: 'INSUFFICIENT_BATCH_STOCK' }
                );
              }

              // Deduct from batch
              await batchRecord.decrement('stock_quantity', {
                by: totalBaseQty,
                transaction: t
              });
            }
          } else {
            // FIFO batch deduction: prioritize unexpired batches with earlier expiry dates
            const availableBatches = await Inventory.findAll({
              where: {
                business_id: businessId,
                product_id: product.id,
                stock_quantity: { [Op.gt]: 0 }
              },
              order: [
                ['expiry_date', 'ASC'],
                ['created_at', 'ASC']
              ],
              lock: t.LOCK.UPDATE,
              transaction: t
            });

            let remainingToDeduct = totalBaseQty;
            for (const b of availableBatches) {
              if (remainingToDeduct <= 0) break;
              if (b.expiry_date && b.expiry_date < todayStr) {
                continue; // Skip expired batches in auto-allocation
              }

              const deductFromThis = Math.min(b.stock_quantity, remainingToDeduct);
              await b.decrement('stock_quantity', { by: deductFromThis, transaction: t });
              remainingToDeduct -= deductFromThis;

              if (!selectedBatchNumber) {
                selectedBatchNumber = b.batch_number;
              }
            }
          }

          // Total Product stock deduction
          if (product.quantity < totalBaseQty) {
            throw Object.assign(
              new Error(`Insufficient overall stock for "${product.name}". Required: ${totalBaseQty} base PCS, Available: ${product.quantity} base PCS.`),
              { statusCode: 422, code: 'INSUFFICIENT_STOCK' }
            );
          }

          const prevProductQty = product.quantity;
          const newProductQty = prevProductQty - totalBaseQty;
          await product.update({ quantity: newProductQty }, { transaction: t });

          // Record stock movement
          stockMovementsToCreate.push({
            business_id: businessId,
            product_id: product.id,
            user_id: req.user.id,
            type: 'SALE',
            quantity_change: -totalBaseQty,
            previous_quantity: prevProductQty,
            new_quantity: newProductQty,
            batch_number: selectedBatchNumber || product.batch_number || null,
            notes: `Invoice Sale: ${chargedQty} ${requestedUnitName} + ${freeQty} Free (${totalBaseQty} PCS)`
          });

          // Prepare invoice item
          invoiceItemsData.push({
            business_id: businessId,
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            unit_cost_price: product.cost_price || 0.00,
            unit_selling_price: finalUnitPrice.toFixed(2),
            quantity: chargedQty,
            free_quantity: freeQty,
            unit_name: requestedUnitName,
            conversion_factor: conversionFactor,
            total_base_quantity: totalBaseQty,
            batch_number: selectedBatchNumber || product.batch_number || null,
            discount_percentage: discPct.toFixed(2),
            discount_amount: lineDiscount.toFixed(2),
            taxable_amount: lineTaxable.toFixed(2),
            tax_rate: taxRate.toFixed(2),
            cgst_amount: lineCgst.toFixed(2),
            sgst_amount: lineSgst.toFixed(2),
            igst_amount: lineIgst.toFixed(2),
            tax_amount: lineTax.toFixed(2),
            line_total: lineTotal.toFixed(2),
            total_price: lineTotal.toFixed(2)
          });
        }

        // Order discount
        const orderDisc = new Decimal(order_discount || 0);
        const totalDiscount = itemDiscountTotal.plus(orderDisc);

        // Final net amount / grand total
        const rawGrandTotal = subtotal.minus(totalDiscount).plus(taxTotal);
        const roundedTotal = rawGrandTotal.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
        const roundOff = roundedTotal.minus(rawGrandTotal).toDecimalPlaces(2);
        const grandTotal = Decimal.max(0, roundedTotal);

        // 7. Payment Processing & Split Tender
        let calculatedPaid = new Decimal(0);
        let calculatedCredit = new Decimal(0);
        let unconfirmedDigital = new Decimal(0);
        const paymentRecords = [];

        // Global verified flag if sent in req.body
        const globalVerified = Boolean(
          req.body.is_payment_confirmed ||
          req.body.isPaymentConfirmed ||
          req.body.paymentConfirmed
        );

        if (Array.isArray(payments) && payments.length > 0) {
          for (const p of payments) {
            const pAmount = new Decimal(p.amount || 0);
            if (pAmount.gt(0)) {
              const method = (p.payment_method || p.method || 'CASH').toUpperCase();
              const pStatus = (p.status || '').toUpperCase();
              const isItemConfirmed = Boolean(
                p.is_confirmed ||
                p.paymentConfirmed ||
                p.verified ||
                (pStatus === 'PAID') ||
                globalVerified
              );

              if (method === 'CREDIT') {
                calculatedCredit = calculatedCredit.plus(pAmount);
                paymentRecords.push({
                  payment_method: 'CREDIT',
                  amount: pAmount.toFixed(2),
                  reference_number: p.reference_number || p.reference || null,
                  status: 'OUTSTANDING',
                  notes: p.notes || `Credit payment recorded`
                });
              } else if (method === 'UPI' || method === 'CARD') {
                // A UPI/Card reference number alone must NEVER be treated as verified payment
                const isConfirmed = isItemConfirmed && pStatus !== 'PENDING_CONFIRMATION';
                if (isConfirmed) {
                  calculatedPaid = calculatedPaid.plus(pAmount);
                } else {
                  unconfirmedDigital = unconfirmedDigital.plus(pAmount);
                }
                const ref = p.reference_number || p.reference || null;
                paymentRecords.push({
                  payment_method: method,
                  amount: pAmount.toFixed(2),
                  reference_number: ref,
                  status: isConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
                  notes: p.notes || (isConfirmed ? `${method} payment confirmed` : `${method} (Pending Confirmation)`)
                });
              } else if (method === 'CASH') {
                calculatedPaid = calculatedPaid.plus(pAmount);
                paymentRecords.push({
                  payment_method: 'CASH',
                  amount: pAmount.toFixed(2),
                  reference_number: p.reference_number || p.reference || null,
                  status: 'PAID',
                  notes: p.notes || `Cash payment received`
                });
              } else {
                // Other methods (BANK_TRANSFER, CHEQUE)
                const isConfirmed = isItemConfirmed && pStatus !== 'PENDING_CONFIRMATION';
                if (isConfirmed) {
                  calculatedPaid = calculatedPaid.plus(pAmount);
                } else {
                  unconfirmedDigital = unconfirmedDigital.plus(pAmount);
                }
                paymentRecords.push({
                  payment_method: method,
                  amount: pAmount.toFixed(2),
                  reference_number: p.reference_number || p.reference || null,
                  status: isConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
                  notes: p.notes || `${method} payment`
                });
              }
            }
          }
        } else {
          // Single payment handling
          const mode = (payment_mode || payment_method || 'CASH').toUpperCase();
          if (mode === 'CREDIT') {
            calculatedCredit = grandTotal;
            paymentRecords.push({
              payment_method: 'CREDIT',
              amount: grandTotal.toFixed(2),
              reference_number: null,
              status: 'OUTSTANDING',
              notes: 'Full payment on Credit'
            });
          } else if (mode === 'UPI' || mode === 'CARD') {
            const isConfirmed = globalVerified;
            if (isConfirmed) {
              const rawPaid = req.body.paid_amount;
              const directPaid = new Decimal(
                (rawPaid !== undefined && rawPaid !== null && rawPaid !== '')
                  ? rawPaid
                  : grandTotal
              );
              calculatedPaid = Decimal.min(directPaid, grandTotal);
            } else {
              unconfirmedDigital = grandTotal;
            }
            paymentRecords.push({
              payment_method: mode,
              amount: grandTotal.toFixed(2),
              reference_number: req.body.reference_number || req.body.upiRef || req.body.cardRef || null,
              status: isConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
              notes: isConfirmed ? `Full payment via ${mode}` : `${mode} (Pending Confirmation)`
            });
          } else {
            const rawPaid = req.body.paid_amount;
            const directPaid = new Decimal(
              (rawPaid !== undefined && rawPaid !== null && rawPaid !== '')
                ? rawPaid
                : grandTotal
            );
            calculatedPaid = Decimal.min(directPaid, grandTotal);
            if (calculatedPaid.gt(0)) {
              paymentRecords.push({
                payment_method: ['CASH', 'BANK_TRANSFER', 'CHEQUE'].includes(mode) ? mode : 'CASH',
                amount: calculatedPaid.toFixed(2),
                reference_number: null,
                status: 'PAID',
                notes: `Full payment via ${mode}`
              });
            }
            if (grandTotal.gt(calculatedPaid)) {
              const remainingCredit = grandTotal.minus(calculatedPaid);
              calculatedCredit = remainingCredit;
              paymentRecords.push({
                payment_method: 'CREDIT',
                amount: remainingCredit.toFixed(2),
                reference_number: null,
                status: 'OUTSTANDING',
                notes: 'Balance due on Credit'
              });
            }
          }
        }

        const balanceDue = grandTotal.minus(calculatedPaid);
        let paymentStatus = 'UNPAID';
        if (calculatedPaid.gte(grandTotal) && grandTotal.gt(0)) {
          paymentStatus = 'PAID';
        } else if (calculatedPaid.gt(0)) {
          paymentStatus = 'PARTIALLY_PAID';
        } else if (unconfirmedDigital.gt(0) && calculatedCredit.isZero()) {
          paymentStatus = 'PENDING_CONFIRMATION';
        }

        // 8. Credit Limit Validation (only for explicit CREDIT tender)
        let creditWarning = null;
        if (calculatedCredit.gt(0)) {
          if (!customer) {
            throw Object.assign(
              new Error('A customer record must be selected when issuing credit or partial payments'),
              { statusCode: 400, code: 'CUSTOMER_REQUIRED_FOR_CREDIT' }
            );
          }

          const currentOutstanding = parseFloat(customer.outstanding_balance || 0);
          const creditLimit = parseFloat(customer.credit_limit || 0);
          const newOutstanding = currentOutstanding + calculatedCredit.toNumber();

          if (creditLimit > 0 && newOutstanding > creditLimit) {
            const exceededBy = (newOutstanding - creditLimit).toFixed(2);
            throw Object.assign(
              new Error(
                `Credit limit exceeded for "${customer.name}". Credit Limit: ${creditLimit}, Current Outstanding: ${currentOutstanding.toFixed(2)}, Additional Credit: ${calculatedCredit.toFixed(2)}. Limit exceeded by ${exceededBy}.`
              ),
              { statusCode: 400, code: 'CREDIT_LIMIT_EXCEEDED' }
            );
          }

          if (creditLimit > 0 && newOutstanding >= creditLimit * 0.8) {
            creditWarning = `Warning: Customer "${customer.name}" outstanding (${newOutstanding.toFixed(2)}) is close to their credit limit (${creditLimit}).`;
          }

          // Update customer outstanding balance
          await customer.increment('outstanding_balance', {
            by: calculatedCredit.toNumber(),
            transaction: t
          });
        }

        // 9. Generate Invoice Number & Create Sale/Invoice
        const invoiceNumber = await generateInvoiceNumber(businessId, t);
        const formattedNotes = idempotency_key
          ? `${notes || ''} [idempotency:${idempotency_key}]`.trim()
          : notes;

        const primaryMode = (payment_mode || payment_method || 'CASH').toUpperCase();
        const dbPaymentStatus = (paymentStatus === 'PENDING_CONFIRMATION') ? 'UNPAID' : paymentStatus;

        const invoice = await Sale.create(
          {
            business_id: businessId,
            customer_id: customer ? customer.id : null,
            user_id: req.user.id,
            invoice_number: invoiceNumber,
            invoice_date: new Date().toISOString().slice(0, 10),
            subtotal: subtotal.toFixed(2),
            total_amount: subtotal.toFixed(2),
            discount_total: totalDiscount.toFixed(2),
            discount_amount: totalDiscount.toFixed(2),
            order_discount: orderDisc.toFixed(2),
            tax_total: taxTotal.toFixed(2),
            tax_amount: taxTotal.toFixed(2),
            cgst_total: cgstTotal.toFixed(2),
            sgst_total: sgstTotal.toFixed(2),
            igst_total: igstTotal.toFixed(2),
            round_off: roundOff.toFixed(2),
            grand_total: grandTotal.toFixed(2),
            net_amount: grandTotal.toFixed(2),
            paid_amount: calculatedPaid.toFixed(2),
            refunded_amount: '0.00',
            balance_due: balanceDue.toFixed(2),
            payment_status: dbPaymentStatus,
            payment_mode: primaryMode,
            status: 'COMPLETED',
            notes: formattedNotes
          },
          { transaction: t }
        );

        // Keep returned invoice model object consistent with domain payment_status
        invoice.payment_status = paymentStatus;
        invoice.setDataValue('payment_status', paymentStatus);

        // 10. Bulk insert invoice items
        for (const itemData of invoiceItemsData) {
          itemData.sale_id = invoice.id;
        }
        await SaleItem.bulkCreate(invoiceItemsData, { transaction: t });

        // 11. Create Stock Movement records
        for (const sm of stockMovementsToCreate) {
          sm.reference_id = invoice.invoice_number;
          await StockMovement.create(sm, { transaction: t });
        }

        // 12. Record payment transactions
        for (const pr of paymentRecords) {
          await Payment.create(
            {
              business_id: businessId,
              sale_id: invoice.id,
              amount: pr.amount,
              payment_method: pr.payment_method,
              reference_number: pr.reference_number,
              payment_date: new Date(),
              notes: pr.notes
            },
            { transaction: t }
          );
        }

        // 13. Audit log
        await AuditLog.create(
          {
            business_id: businessId,
            user_id: req.user.id,
            action: 'INVOICE_CREATE',
            entity: 'Invoice',
            entity_id: String(invoice.id),
            changes: {
              invoice_number: invoice.invoice_number,
              grand_total: invoice.grand_total,
              paid_amount: invoice.paid_amount,
              balance_due: invoice.balance_due,
              customer_id: invoice.customer_id
            },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return {
          invoice_id: invoice.id,
          creditWarning
        };
      });

      // 14. Return the complete populated invoice
      const fullInvoice = await Sale.findByPk(result.invoice_id, {
        include: [
          {
            model: Customer,
            as: 'customer'
          },
          {
            model: User,
            as: 'cashier',
            attributes: ['id', 'name', 'role']
          },
          {
            model: SaleItem,
            as: 'items'
          },
          {
            model: Payment,
            as: 'payments'
          },
          {
            model: Business,
            as: 'business',
            attributes: ['id', 'name', 'email', 'phone', 'address', 'tax_number', 'state', 'currency_code', 'currency_symbol']
          }
        ]
      });

      if (fullInvoice && fullInvoice.payment_status === 'UNPAID') {
        const hasPending = (fullInvoice.payments || []).some(
          (p) => p.notes && p.notes.includes('Pending Confirmation')
        );
        if (hasPending) {
          fullInvoice.setDataValue('payment_status', 'PENDING_CONFIRMATION');
          fullInvoice.payment_status = 'PENDING_CONFIRMATION';
        }
      }

      return apiResponse.success(
        res,
        {
          invoice: fullInvoice,
          sale: fullInvoice,
          credit_warning: result.creditWarning
        },
        'Invoice created and inventory deducted successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/invoices/sync-batch — Idempotent batch synchronization of offline invoices.
   * Leverages the battle-tested atomic create pipeline with per-bill transaction isolation.
   */
  syncBatch: async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return apiResponse.error(res, 'Authentication required', 401, 'UNAUTHORIZED');
      }

      const invoices = Array.isArray(req.body.invoices) ? req.body.invoices : [];
      const results = [];

      for (const invPayload of invoices) {
        const localBillId = invPayload.local_bill_id || invPayload.idempotency_key;
        try {
          const mockReq = {
            ...req,
            body: {
              ...invPayload,
              idempotency_key: localBillId
            }
          };

          let capturedData = null;
          let capturedStatus = 200;
          let capturedError = null;

          const mockRes = {
            status: (code) => {
              capturedStatus = code;
              return mockRes;
            },
            json: (payload) => {
              capturedData = payload;
              return mockRes;
            }
          };

          await invoiceController.create(mockReq, mockRes, (err) => {
            if (err) capturedError = err;
          });

          if (capturedError) {
            results.push({
              local_bill_id: localBillId,
              status: 'FAILED',
              error: capturedError.message || 'Invoice synchronization failed'
            });
          } else if (capturedData && capturedData.success) {
            const invoiceObj = capturedData.data?.invoice || capturedData.data?.sale;
            results.push({
              local_bill_id: localBillId,
              status: capturedStatus === 200 ? 'ALREADY_SYNCED' : 'SYNCED',
              invoice_id: invoiceObj.id,
              invoice_number: invoiceObj.invoice_number,
              invoice: invoiceObj
            });
          } else {
            results.push({
              local_bill_id: localBillId,
              status: 'FAILED',
              error: capturedData?.message || 'Invoice synchronization failed'
            });
          }
        } catch (err) {
          results.push({
            local_bill_id: localBillId,
            status: 'FAILED',
            error: err.message || 'Invoice synchronization failed'
          });
        }
      }

      return apiResponse.success(
        res,
        {
          results,
          total: invoices.length,
          synced: results.filter((r) => r.status === 'SYNCED' || r.status === 'ALREADY_SYNCED').length
        },
        'Batch synchronization completed',
        200
      );
    } catch (error) {
      next(error);
    }
  }
};

