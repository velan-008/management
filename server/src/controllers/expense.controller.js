import { Op } from 'sequelize';
import { Expense, User, AuditLog } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const expenseController = {
  /**
   * GET /api/expenses — List expenses with filters and pagination
   */
  list: async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        category,
        payment_method,
        date_from,
        date_to
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const where = { business_id: req.businessId };

      if (search.trim()) {
        where.description = { [Op.like]: `%${search.trim()}%` };
      }
      if (category) where.category = category;
      if (payment_method) where.payment_method = payment_method;
      if (date_from || date_to) {
        where.expense_date = {};
        if (date_from) where.expense_date[Op.gte] = date_from;
        if (date_to) where.expense_date[Op.lte] = date_to;
      }

      const { rows, count } = await Expense.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['expense_date', 'DESC'], ['created_at', 'DESC']],
        limit: Number(limit),
        offset
      });

      return apiResponse.success(res, { expenses: rows }, 'Expenses retrieved', 200, {
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
   * GET /api/expenses/:id — Single expense
   */
  getById: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, business_id: req.businessId },
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email']
          }
        ]
      });
      if (!expense) return apiResponse.error(res, 'Expense not found', 404, 'NOT_FOUND');
      return apiResponse.success(res, { expense }, 'Expense retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/expenses — Record an expense
   */
  create: async (req, res, next) => {
    try {
      const {
        description,
        amount,
        category,
        expense_date,
        payment_method = 'CASH',
        receipt_url
      } = req.body;

      if (!description || !description.trim()) {
        return apiResponse.error(res, 'Expense description is required', 400, 'VALIDATION_ERROR');
      }

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return apiResponse.error(res, 'Expense amount must be a positive number', 400, 'VALIDATION_ERROR');
      }

      const acceptedMethods = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'];
      const validMethod = acceptedMethods.includes(payment_method) ? payment_method : 'CASH';

      const initialStatus = req.user?.role === 'STAFF' ? 'PENDING' : 'APPROVED';

      const expense = await Expense.create({
        business_id: req.businessId,
        created_by: req.user.id,
        category: (category || 'Other').trim(),
        amount: parsedAmount.toFixed(2),
        expense_date: expense_date || new Date().toISOString().slice(0, 10),
        payment_method: validMethod,
        description: description.trim(),
        receipt_url: receipt_url ? receipt_url.trim() : null,
        approval_status: initialStatus
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'EXPENSE_CREATE',
        entity: 'Expense',
        entity_id: String(expense.id),
        changes: { description: expense.description, amount: expense.amount, category: expense.category },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { expense }, 'Expense recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/expenses/:id — Update expense
   */
  update: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!expense) return apiResponse.error(res, 'Expense not found', 404, 'NOT_FOUND');

      const {
        description,
        amount,
        category,
        expense_date,
        payment_method,
        receipt_url
      } = req.body;

      let parsedAmount = expense.amount;
      if (amount !== undefined) {
        const p = parseFloat(amount);
        if (isNaN(p) || p <= 0) {
          return apiResponse.error(res, 'Amount must be greater than zero', 400, 'VALIDATION_ERROR');
        }
        parsedAmount = p.toFixed(2);
      }

      await expense.update({
        description: description !== undefined ? description.trim() : expense.description,
        amount: parsedAmount,
        category: category !== undefined ? category.trim() : expense.category,
        expense_date: expense_date !== undefined ? expense_date : expense.expense_date,
        payment_method: payment_method !== undefined ? payment_method : expense.payment_method,
        receipt_url: receipt_url !== undefined ? (receipt_url ? receipt_url.trim() : null) : expense.receipt_url
      });

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'EXPENSE_UPDATE',
        entity: 'Expense',
        entity_id: String(expense.id),
        changes: { description: expense.description, amount: expense.amount },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, { expense }, 'Expense updated successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * DELETE /api/expenses/:id — Delete expense
   */
  delete: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!expense) return apiResponse.error(res, 'Expense not found', 404, 'NOT_FOUND');

      await expense.destroy();

      await AuditLog.create({
        business_id: req.businessId,
        user_id: req.user.id,
        action: 'EXPENSE_DELETE',
        entity: 'Expense',
        entity_id: String(req.params.id),
        changes: { description: expense.description, amount: expense.amount },
        ip_address: req.ip || null
      });

      return apiResponse.success(res, {}, 'Expense deleted successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/expenses/:id/approve — Admin approves staff expense
   */
  approve: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!expense) return apiResponse.error(res, 'Expense not found', 404, 'NOT_FOUND');

      await expense.update({ approval_status: 'APPROVED' });
      return apiResponse.success(res, { expense }, 'Expense approved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /api/expenses/:id/reject — Admin rejects staff expense
   */
  reject: async (req, res, next) => {
    try {
      const expense = await Expense.findOne({
        where: { id: req.params.id, business_id: req.businessId }
      });
      if (!expense) return apiResponse.error(res, 'Expense not found', 404, 'NOT_FOUND');

      await expense.update({ approval_status: 'REJECTED' });
      return apiResponse.success(res, { expense }, 'Expense rejected');
    } catch (error) {
      next(error);
    }
  }
};
