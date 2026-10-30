import { Op } from 'sequelize';
import { Customer, Sale, Payment, AuditLog } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const customerController = {
  /**
   * GET /api/customers — List customers with search & pagination
   */
  list: async (req, res, next) => {
    try {
      const { search = '', page = 1, limit = 20, sort = 'name', order = 'ASC' } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const where = { business_id: req.businessId };

      if (search.trim()) {
        const query = `%${search.trim()}%`;
        where[Op.or] = [
          { name: { [Op.like]: query } },
          { phone: { [Op.like]: query } },
          { email: { [Op.like]: query } },
          { tax_number: { [Op.like]: query } }
        ];
      }

      const validSortCols = ['name', 'created_at', 'outstanding_balance', 'credit_limit'];
      const sortCol = validSortCols.includes(sort) ? sort : 'name';
      const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const { rows, count } = await Customer.findAndCountAll({
        where,
        order: [[sortCol, sortOrder]],
        limit: Number(limit),
        offset
      });

      return apiResponse.success(res, { customers: rows }, 'Customers retrieved', 200, {
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
   * GET /api/customers/:id — Single customer with account summary
   */
  getById: async (req, res, next) => {
    try {
      const customer = await Customer.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!customer) return apiResponse.error(res, 'Customer not found', 404, 'NOT_FOUND');

      const recentSales = await Sale.findAll({
        where: { customer_id: customer.id, business_id: req.businessId },
        order: [['created_at', 'DESC']],
        limit: 5
      });

      return apiResponse.success(res, { customer, recentSales }, 'Customer retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/customers — Create customer
   */
  create: async (req, res, next) => {
    try {
      const {
        name,
        phone,
        email,
        address,
        state,
        tax_number,
        credit_limit = 0
      } = req.body;

      if (!name || !name.trim()) {
        return apiResponse.error(res, 'Customer name is required', 400, 'VALIDATION_ERROR');
      }

      // Check phone uniqueness within tenant
      if (phone && phone.trim()) {
        const existing = await Customer.findOne({
          where: { business_id: req.businessId, phone: phone.trim() }
        });
        if (existing) {
          return apiResponse.error(res, 'A customer with this phone number already exists', 409, 'DUPLICATE_PHONE');
        }
      }

      const customer = await Customer.create({
        business_id: req.businessId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        address: address ? address.trim() : null,
        state: state ? state.trim() : null,
        tax_number: tax_number ? tax_number.trim() : null,
        credit_limit: parseFloat(credit_limit) || 0,
        outstanding_balance: 0,
        store_credit: 0
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'CUSTOMER_CREATE',
        entity: 'Customer',
        entity_id: String(customer.id),
        changes: { name: customer.name, phone: customer.phone },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { customer }, 'Customer created successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/customers/:id — Update customer
   */
  update: async (req, res, next) => {
    try {
      const customer = await Customer.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!customer) return apiResponse.error(res, 'Customer not found', 404, 'NOT_FOUND');

      const {
        name,
        phone,
        email,
        address,
        state,
        tax_number,
        credit_limit
      } = req.body;

      // Check phone uniqueness if phone is being changed
      if (phone && phone.trim() && phone.trim() !== customer.phone) {
        const existing = await Customer.findOne({
          where: {
            business_id: req.businessId,
            phone: phone.trim(),
            id: { [Op.ne]: customer.id }
          }
        });
        if (existing) {
          return apiResponse.error(res, 'Another customer with this phone number already exists', 409, 'DUPLICATE_PHONE');
        }
      }

      await customer.update({
        name: name !== undefined ? name.trim() : customer.name,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : customer.phone,
        email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : customer.email,
        address: address !== undefined ? (address ? address.trim() : null) : customer.address,
        state: state !== undefined ? (state ? state.trim() : null) : customer.state,
        tax_number: tax_number !== undefined ? (tax_number ? tax_number.trim() : null) : customer.tax_number,
        credit_limit: credit_limit !== undefined ? parseFloat(credit_limit) || 0 : customer.credit_limit
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'CUSTOMER_UPDATE',
        entity: 'Customer',
        entity_id: String(customer.id),
        changes: { name: customer.name },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { customer }, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/customers/:id — Safe customer deletion
   */
  delete: async (req, res, next) => {
    try {
      const customer = await Customer.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!customer) return apiResponse.error(res, 'Customer not found', 404, 'NOT_FOUND');

      // Check if customer has transaction history or outstanding balance
      const salesCount = await Sale.count({
        where: { customer_id: customer.id, business_id: req.businessId }
      });

      if (salesCount > 0 || parseFloat(customer.outstanding_balance) > 0) {
        return apiResponse.error(
          res,
          `Cannot delete customer with ${salesCount} existing invoices or an outstanding balance (${customer.outstanding_balance}). Customer record is preserved for financial audit integrity.`,
          400,
          'HAS_TRANSACTIONS'
        );
      }

      await customer.destroy();

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'CUSTOMER_DELETE',
        entity: 'Customer',
        entity_id: String(req.params.id),
        changes: { name: customer.name },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, {}, 'Customer deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/customers/:id/sales — Full customer sales history
   */
  salesHistory: async (req, res, next) => {
    try {
      const customer = await Customer.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!customer) return apiResponse.error(res, 'Customer not found', 404, 'NOT_FOUND');

      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const { rows, count } = await Sale.findAndCountAll({
        where: { customer_id: customer.id, business_id: req.businessId },
        include: [
          { model: Payment, as: 'payments' }
        ],
        order: [['created_at', 'DESC']],
        limit: Number(limit),
        offset
      });

      return apiResponse.success(res, { customer, sales: rows }, 'Sales history retrieved', 200, {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  }
};
