import { Op } from 'sequelize';
import Decimal from 'decimal.js';
import { sequelize, Supplier, Purchase, SupplierPayment, AuditLog } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const supplierController = {
  /**
   * GET /api/suppliers — List suppliers
   */
  list: async (req, res, next) => {
    try {
      const { search = '', is_active } = req.query;
      const where = { business_id: req.businessId };

      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      if (search.trim()) {
        const query = `%${search.trim()}%`;
        where[Op.or] = [
          { name: { [Op.like]: query } },
          { company_name: { [Op.like]: query } },
          { phone: { [Op.like]: query } },
          { email: { [Op.like]: query } },
          { gst_number: { [Op.like]: query } }
        ];
      }

      const suppliers = await Supplier.findAll({
        where,
        order: [['name', 'ASC']]
      });

      return apiResponse.success(res, { suppliers }, 'Suppliers retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/suppliers/:id — Single supplier details with purchase & payment history
   */
  getById: async (req, res, next) => {
    try {
      const supplier = await Supplier.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: Purchase,
            as: 'purchases',
            limit: 10,
            order: [['purchase_date', 'DESC']]
          },
          {
            model: SupplierPayment,
            as: 'payments',
            limit: 10,
            order: [['payment_date', 'DESC']]
          }
        ]
      });

      if (!supplier) {
        return apiResponse.error(res, 'Supplier not found', 404, 'NOT_FOUND');
      }

      return apiResponse.success(res, { supplier }, 'Supplier retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/suppliers — Create a new supplier
   */
  create: async (req, res, next) => {
    try {
      const {
        name,
        company_name,
        email,
        phone,
        address,
        gst_number,
        state,
        payment_terms = 'Net 30',
        opening_balance = 0
      } = req.body;

      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Supplier name is required', 400, 'VALIDATION_ERROR');
      }

      const balance = parseFloat(opening_balance) || 0;

      const supplier = await Supplier.create({
        business_id: req.businessId,
        name: name.trim(),
        company_name: company_name ? company_name.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        gst_number: gst_number ? gst_number.trim().toUpperCase() : null,
        state: state ? state.trim() : null,
        payment_terms: payment_terms || 'Net 30',
        outstanding_balance: balance,
        is_active: true
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'SUPPLIER_CREATE',
        entity: 'Supplier',
        entity_id: String(supplier.id),
        changes: { name: supplier.name, company: supplier.company_name },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { supplier }, 'Supplier created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/suppliers/:id — Update supplier
   */
  update: async (req, res, next) => {
    try {
      const supplier = await Supplier.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!supplier) {
        return apiResponse.error(res, 'Supplier not found', 404, 'NOT_FOUND');
      }

      const {
        name,
        company_name,
        email,
        phone,
        address,
        gst_number,
        state,
        payment_terms,
        is_active
      } = req.body;

      await supplier.update({
        name: name !== undefined ? name.trim() : supplier.name,
        company_name: company_name !== undefined ? (company_name ? company_name.trim() : null) : supplier.company_name,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : supplier.email,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : supplier.phone,
        address: address !== undefined ? (address ? address.trim() : null) : supplier.address,
        gst_number: gst_number !== undefined ? (gst_number ? gst_number.trim().toUpperCase() : null) : supplier.gst_number,
        state: state !== undefined ? (state ? state.trim() : null) : supplier.state,
        payment_terms: payment_terms !== undefined ? payment_terms : supplier.payment_terms,
        is_active: is_active !== undefined ? Boolean(is_active) : supplier.is_active
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'SUPPLIER_UPDATE',
        entity: 'Supplier',
        entity_id: String(supplier.id),
        changes: { name: supplier.name },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { supplier }, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/suppliers/:id/payments — Record a payment made to a supplier
   */
  recordPayment: async (req, res, next) => {
    try {
      const supplier = await Supplier.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!supplier) {
        return apiResponse.error(res, 'Supplier not found', 404, 'NOT_FOUND');
      }

      const {
        amount,
        payment_method = 'BANK_TRANSFER',
        reference_number,
        payment_date,
        purchase_id,
        notes
      } = req.body;

      const payAmount = new Decimal(amount || 0);
      if (payAmount.lessThanOrEqualTo(0)) {
        return apiResponse.error(res, 'Payment amount must be greater than 0', 400, 'VALIDATION_ERROR');
      }

      const pDate = payment_date || new Date().toISOString().slice(0, 10);

      const result = await sequelize.transaction(async (t) => {
        const payment = await SupplierPayment.create(
          {
            business_id: req.businessId,
            supplier_id: supplier.id,
            purchase_id: purchase_id || null,
            amount: payAmount.toFixed(2),
            payment_method,
            reference_number: reference_number || `SPAY-${Date.now()}`,
            payment_date: pDate,
            notes: notes || null
          },
          { transaction: t }
        );

        // Update supplier balance
        const currentBal = new Decimal(supplier.outstanding_balance || 0);
        const newBal = Decimal.max(0, currentBal.minus(payAmount));
        await supplier.update({ outstanding_balance: newBal.toFixed(2) }, { transaction: t });

        // If payment is tied to a specific purchase, update purchase paid amount
        if (purchase_id) {
          const purchase = await Purchase.findOne({
            where: { id: purchase_id, business_id: req.businessId },
            transaction: t
          });
          if (purchase) {
            const purchasePaid = new Decimal(purchase.paid_amount || 0).plus(payAmount);
            const purchaseGrand = new Decimal(purchase.grand_total || 0);
            const newDue = Decimal.max(0, purchaseGrand.minus(purchasePaid));
            const newStatus = newDue.isZero() ? 'PAID' : (purchasePaid.greaterThan(0) ? 'PARTIALLY_PAID' : 'UNPAID');

            await purchase.update({
              paid_amount: purchasePaid.toFixed(2),
              balance_due: newDue.toFixed(2),
              payment_status: newStatus
            }, { transaction: t });
          }
        }

        await AuditLog.create(
          {
            business_id: req.businessId,
            user_id: req.user?.id || null,
            action: 'SUPPLIER_PAYMENT_RECORD',
            entity: 'SupplierPayment',
            entity_id: String(payment.id),
            changes: { supplier_id: supplier.id, amount: payAmount.toFixed(2) },
            ip_address: req.ip || null
          },
          { transaction: t }
        );

        return { payment, newBalance: newBal.toFixed(2) };
      });

      return apiResponse.success(
        res,
        { payment: result.payment, outstanding_balance: result.newBalance },
        'Supplier payment recorded successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/suppliers/:id — Deactivate supplier
   */
  delete: async (req, res, next) => {
    try {
      const supplier = await Supplier.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });

      if (!supplier) {
        return apiResponse.error(res, 'Supplier not found', 404, 'NOT_FOUND');
      }

      await supplier.update({ is_active: false });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user?.id || null,
        action: 'SUPPLIER_DEACTIVATE',
        entity: 'Supplier',
        entity_id: String(supplier.id),
        changes: { is_active: false },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { supplier }, 'Supplier deactivated successfully');
    } catch (error) {
      next(error);
    }
  }
};

