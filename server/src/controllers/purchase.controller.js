import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import {
  sequelize, Purchase, PurchaseItem, Supplier, Product, StockMovement, SupplierPayment, AuditLog
} from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const purchaseController = {
  /**
   * GET /api/purchases — List purchases
   */
  list: async (req, res, next) => {
    try {
      const { status, supplier_id, date_from, date_to, search } = req.query;
      const where = { business_id: req.businessId };

      if (status) where.status = status;
      if (supplier_id) where.supplier_id = supplier_id;

      if (date_from || date_to) {
        where.purchase_date = {};
        if (date_from) where.purchase_date[Op.gte] = date_from;
        if (date_to) where.purchase_date[Op.lte] = date_to;
      }

      if (search && search.trim()) {
        where.invoice_number = { [Op.like]: `%${search.trim()}%` };
      }

      const purchases = await Purchase.findAll({
        where,
        include: [
          {
            model: Supplier,
            as: 'supplier',
            attributes: ['id', 'name', 'company_name', 'phone', 'gst_number']
          },
          {
            model: PurchaseItem,
            as: 'items'
          }
        ],
        order: [['purchase_date', 'DESC'], ['id', 'DESC']]
      });

      return apiResponse.success(res, { purchases }, 'Purchases retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/purchases/:id — Single purchase details
   */
  getById: async (req, res, next) => {
    try {
      const purchase = await Purchase.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: Supplier,
            as: 'supplier'
          },
          {
            model: PurchaseItem,
            as: 'items'
          },
          {
            model: SupplierPayment,
            as: 'payments'
          }
        ]
      });

      if (!purchase) {
        return apiResponse.error(res, 'Purchase record not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { purchase }, 'Purchase retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/purchases — Create a purchase order
   */
  create: async (req, res, next) => {
    try {
      const {
        supplier_id,
        purchase_date,
        items,
        discount_total = 0,
        freight_charges = 0,
        paid_amount = 0,
        payment_method = 'BANK_TRANSFER',
        notes
      } = req.body;

      if (!supplier_id) {
        return apiResponse.error(res, 'Supplier is required', 400, 'VALIDATION_ERROR');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return apiResponse.error(res, 'At least one item is required in the purchase order', 400, 'VALIDATION_ERROR');
      }

      const supplier = await Supplier.findOne({
        where: { id: supplier_id, business_id: req.businessId }
      });
      if (!supplier) {
        return apiResponse.error(res, 'Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
      }

      const pDate = purchase_date || new Date().toISOString().slice(0, 10);
      const invoiceNumber = `PO-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

      let subtotalDec = new Decimal(0);
      let taxTotalDec = new Decimal(0);
      const processedItems = [];

      for (const item of items) {
        const qty = parseInt(item.quantity || item.quantity_ordered, 10) || 1;
        const costPrice = new Decimal(item.unit_cost_price || item.cost_price || 0);
        const taxRate = new Decimal(item.tax_rate || 0);

        const lineBase = costPrice.times(qty);
        const lineTax = lineBase.times(taxRate.dividedBy(100));
        const lineTotal = lineBase.plus(lineTax);

        subtotalDec = subtotalDec.plus(lineBase);
        taxTotalDec = taxTotalDec.plus(lineTax);

        processedItems.push({
          product_id: item.product_id || null,
          product_name: item.product_name || item.name || 'Wholesale Product',
          product_sku: item.product_sku || item.sku || 'SKU-GEN',
          unit_cost_price: costPrice.toFixed(2),
          quantity_ordered: qty,
          quantity_received: 0,
          unit: item.unit || 'pcs',
          tax_rate: taxRate.toFixed(2),
          tax_amount: lineTax.toFixed(2),
          line_total: lineTotal.toFixed(2)
        });
      }

      const discountDec = new Decimal(discount_total || 0);
      const freightDec = new Decimal(freight_charges || 0);
      const grandTotalDec = Decimal.max(0, subtotalDec.plus(taxTotalDec).plus(freightDec).minus(discountDec));
      const paidDec = new Decimal(paid_amount || 0);
      const balanceDueDec = Decimal.max(0, grandTotalDec.minus(paidDec));

      const paymentStatus = balanceDueDec.isZero()
        ? 'PAID'
        : paidDec.greaterThan(0)
        ? 'PARTIALLY_PAID'
        : 'UNPAID';

      const result = await sequelize.transaction(async (t) => {
        const purchase = await Purchase.create(
          {
            business_id: req.businessId,
            supplier_id: supplier.id,
            user_id: req.user?.id || null,
            invoice_number: invoiceNumber,
            purchase_date: pDate,
            status: 'ORDERED',
            subtotal: subtotalDec.toFixed(2),
            tax_total: taxTotalDec.toFixed(2),
            discount_total: discountDec.toFixed(2),
            freight_charges: freightDec.toFixed(2),
            grand_total: grandTotalDec.toFixed(2),
            paid_amount: paidDec.toFixed(2),
            balance_due: balanceDueDec.toFixed(2),
            payment_status: paymentStatus,
            payment_method,
            notes: notes || null
          },
          { transaction: t }
        );

        for (const it of processedItems) {
          await PurchaseItem.create(
            {
              ...it,
              business_id: req.businessId,
              purchase_id: purchase.id
            },
            { transaction: t }
          );
        }

        // If an initial advance payment was made
        if (paidDec.greaterThan(0)) {
          await SupplierPayment.create(
            {
              business_id: req.businessId,
              supplier_id: supplier.id,
              purchase_id: purchase.id,
              amount: paidDec.toFixed(2),
              payment_method,
              reference_number: `ADV-${purchase.id}`,
              payment_date: pDate,
              notes: 'Advance paid on PO creation'
            },
            { transaction: t }
          );
        }

        await AuditLog.create(
          {
            business_id: req.businessId,
            user_id: req.user?.id || null,
            action: 'PURCHASE_ORDER_CREATE',
            entity: 'Purchase',
            entity_id: String(purchase.id),
            changes: { invoice_number: invoiceNumber, grand_total: grandTotalDec.toFixed(2) },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return purchase;
      });

      return apiResponse.success(res, { purchase: result }, 'Purchase order created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/purchases/:id/receive — Goods receipt & quantity verification
   * Crucial wholesale requirement: Only confirmed received quantities increase inventory.
   * Prevents duplicate stock updates when processing the same receipt.
   */
  receiveGoods: async (req, res, next) => {
    try {
      const { items } = req.body; // Array of { id (item id), quantity_received }

      const purchase = await Purchase.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [{ model: PurchaseItem, as: 'items' }, { model: Supplier, as: 'supplier' }]
      });

      if (!purchase) {
        return apiResponse.error(res, 'Purchase order not found', 404, 'NOT_FOUND');
      }

      if (purchase.status === 'RECEIVED') {
        return apiResponse.error(res, 'This purchase order has already been fully received and inventory updated', 409, 'ALREADY_RECEIVED');
      }

      if (purchase.status === 'CANCELLED') {
        return apiResponse.error(res, 'Cannot receive goods for a cancelled purchase order', 400, 'ORDER_CANCELLED');
      }

      const result = await sequelize.transaction(async (t) => {
        let totalItemsReceived = 0;
        let totalItemsOrdered = 0;

        for (const dbItem of purchase.items) {
          totalItemsOrdered += dbItem.quantity_ordered;

          // Find requested received quantity or default to receiving full ordered qty
          let qtyToReceive = dbItem.quantity_ordered - dbItem.quantity_received;
          if (items && Array.isArray(items)) {
            const foundReq = items.find((i) => i.id === dbItem.id || i.product_id === dbItem.product_id);
            if (foundReq) {
              const reqQty = parseInt(foundReq.quantity_received !== undefined ? foundReq.quantity_received : foundReq.quantity, 10);
              qtyToReceive = Math.max(0, reqQty);
            }
          }

          if (qtyToReceive > 0) {
            // Update item record
            const newReceivedTotal = dbItem.quantity_received + qtyToReceive;
            await dbItem.update({ quantity_received: newReceivedTotal }, { transaction: t });
            totalItemsReceived += newReceivedTotal;

            // If product is linked, update inventory and write stock ledger
            if (dbItem.product_id) {
              const product = await Product.findOne({
                where: { id: dbItem.product_id, business_id: req.businessId },
                transaction: t,
                lock: t.LOCK.UPDATE
              });

              if (product) {
                const prevQty = product.quantity;
                const newQty = prevQty + qtyToReceive;

                await product.update(
                  {
                    quantity: newQty,
                    // If cost price in PO differs, we can update cost_price
                    cost_price: dbItem.unit_cost_price
                  },
                  { transaction: t }
                );

                await StockMovement.create(
                  {
                    business_id: req.businessId,
                    product_id: product.id,
                    user_id: req.user?.id || null,
                    type: 'PURCHASE',
                    quantity_change: qtyToReceive,
                    previous_quantity: prevQty,
                    new_quantity: newQty,
                    reference_id: purchase.invoice_number,
                    notes: `Goods received for PO ${purchase.invoice_number}`
                  },
                  { transaction: t }
                );
              }
            }
          } else {
            totalItemsReceived += dbItem.quantity_received;
          }
        }

        const newStatus = totalItemsReceived >= totalItemsOrdered ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
        await purchase.update({ status: newStatus }, { transaction: t });

        // Update supplier outstanding balance with the balance due
        if (purchase.supplier && parseFloat(purchase.balance_due) > 0) {
          const currentBal = new Decimal(purchase.supplier.outstanding_balance || 0);
          const addedDue = new Decimal(purchase.balance_due);
          await purchase.supplier.update(
            { outstanding_balance: currentBal.plus(addedDue).toFixed(2) },
            { transaction: t }
          );
        }

        await AuditLog.create(
          {
            business_id: req.businessId,
            user_id: req.user?.id || null,
            action: 'GOODS_RECEIPT_CONFIRM',
            entity: 'Purchase',
            entity_id: String(purchase.id),
            changes: { status: newStatus, receivedItems: totalItemsReceived },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return purchase;
      });

      return apiResponse.success(res, { purchase: result }, 'Goods received and stock updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/purchases/:id/payments — Add supplier payment against purchase
   */
  recordPayment: async (req, res, next) => {
    try {
      const purchase = await Purchase.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [{ model: Supplier, as: 'supplier' }]
      });

      if (!purchase) {
        return apiResponse.error(res, 'Purchase not found', 404, 'NOT_FOUND');
      }

      const {
        amount,
        payment_method = 'BANK_TRANSFER',
        reference_number,
        payment_date,
        notes
      } = req.body;

      const payAmount = new Decimal(amount || 0);
      if (payAmount.lessThanOrEqualTo(0)) {
        return apiResponse.error(res, 'Payment amount must be greater than 0', 400, 'VALIDATION_ERROR');
      }

      const currentDue = new Decimal(purchase.balance_due || 0);
      if (currentDue.isZero()) {
        return apiResponse.error(res, 'This purchase is already fully paid', 400, 'ALREADY_PAID');
      }

      const pDate = payment_date || new Date().toISOString().slice(0, 10);

      const result = await sequelize.transaction(async (t) => {
        const payment = await SupplierPayment.create(
          {
            business_id: req.businessId,
            supplier_id: purchase.supplier_id,
            purchase_id: purchase.id,
            amount: payAmount.toFixed(2),
            payment_method,
            reference_number: reference_number || `SPAY-${Date.now()}`,
            payment_date: pDate,
            notes: notes || null
          },
          { transaction: t }
        );

        const newPaid = new Decimal(purchase.paid_amount || 0).plus(payAmount);
        const grand = new Decimal(purchase.grand_total || 0);
        const newDue = Decimal.max(0, grand.minus(newPaid));
        const status = newDue.isZero() ? 'PAID' : 'PARTIALLY_PAID';

        await purchase.update({
          paid_amount: newPaid.toFixed(2),
          balance_due: newDue.toFixed(2),
          payment_status: status
        }, { transaction: t });

        if (purchase.supplier) {
          const currentBal = new Decimal(purchase.supplier.outstanding_balance || 0);
          const newBal = Decimal.max(0, currentBal.minus(payAmount));
          await purchase.supplier.update({ outstanding_balance: newBal.toFixed(2) }, { transaction: t });
        }

        return { purchase, payment };
      });

      return apiResponse.success(res, result, 'Payment recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/purchases/:id/cancel — Cancel purchase order
   */
  cancel: async (req, res, next) => {
    try {
      const purchase = await Purchase.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!purchase) {
        return apiResponse.error(res, 'Purchase not found', 404, 'NOT_FOUND');
      }

      if (purchase.status === 'RECEIVED' || purchase.status === 'PARTIALLY_RECEIVED') {
        return apiResponse.error(res, 'Cannot cancel a purchase order after goods have been received', 400, 'CANNOT_CANCEL');
      }

      await purchase.update({ status: 'CANCELLED' });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'PURCHASE_ORDER_CANCEL',
        entity: 'Purchase',
        entity_id: String(purchase.id),
        changes: { status: 'CANCELLED' },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { purchase }, 'Purchase order cancelled successfully');
    } catch (error) {
      next(error);
    }
  }
};

