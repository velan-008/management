import { Op } from 'sequelize';
import { reportService, sanitizeCsvCell } from '../services/report.service.js';
import { Sale, Product, Expense, Customer, Category, Supplier, Purchase, Payment, StockMovement } from '../models/index.js';
import { apiResponse } from '../utils/apiResponse.js';

export const reportController = {
  /**
   * GET /api/reports/dashboard
   */
  getDashboard: async (req, res, next) => {
    try {
      const { days, date_from, date_to } = req.query;
      const periodDays = parseInt(days || '7', 10);
      const data = await reportService.getDashboardMetrics(req.businessId, periodDays, date_from, date_to);
      return apiResponse.success(res, data, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/profit-loss
   */
  getProfitLoss: async (req, res, next) => {
    try {
      const { date_from, date_to } = req.query;
      const data = await reportService.getProfitLossReport(req.businessId, date_from, date_to);
      return apiResponse.success(res, data, 'Profit & Loss report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/sales-summary
   */
  getSalesSummary: async (req, res, next) => {
    try {
      const { date_from, date_to } = req.query;
      const data = await reportService.getSalesSummary(req.businessId, date_from, date_to);
      return apiResponse.success(res, data, 'Sales summary retrieved');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/inventory
   */
  getInventory: async (req, res, next) => {
    try {
      const data = await reportService.getInventoryReport(req.businessId);
      return apiResponse.success(res, data, 'Inventory report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/payments
   */
  getPaymentsReport: async (req, res, next) => {
    try {
      const data = await reportService.getPaymentsReport(req.businessId, req.query);
      return apiResponse.success(res, data, 'Payments report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/gst
   */
  getGstReport: async (req, res, next) => {
    try {
      const data = await reportService.getGstReport(req.businessId, req.query);
      return apiResponse.success(res, data, 'GST report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/customers
   */
  getCustomersReport: async (req, res, next) => {
    try {
      const data = await reportService.getCustomersReport(req.businessId, req.query);
      return apiResponse.success(res, data, 'Customers report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/suppliers
   */
  getSuppliersReport: async (req, res, next) => {
    try {
      const data = await reportService.getSuppliersReport(req.businessId, req.query);
      return apiResponse.success(res, data, 'Suppliers report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/expenses
   */
  getExpensesReport: async (req, res, next) => {
    try {
      const data = await reportService.getExpensesReport(req.businessId, req.query);
      return apiResponse.success(res, data, 'Expenses report generated');
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/reports/export/:type — Export CSV with formula injection prevention
   */
  exportCsv: async (req, res, next) => {
    try {
      const { type } = req.params;
      const businessId = req.businessId;

      let filename = `export-${type}-${Date.now()}.csv`;
      let csvContent = '';

      if (type === 'sales') {
        const sales = await Sale.findAll({
          where: { business_id: businessId },
          include: [{ model: Customer, as: 'customer', attributes: ['name'] }],
          order: [['created_at', 'DESC']]
        });

        const headers = ['Invoice Number', 'Date', 'Customer', 'Subtotal', 'Tax', 'Grand Total', 'Paid Amount', 'Balance Due', 'Status'];
        const rows = sales.map((s) => [
          s.invoice_number,
          s.invoice_date,
          s.customer ? s.customer.name : 'Walk-in Customer',
          s.subtotal,
          s.tax_total,
          s.grand_total,
          s.paid_amount,
          s.balance_due,
          s.status
        ]);

        csvContent = [
          headers.map(sanitizeCsvCell).join(','),
          ...rows.map((row) => row.map(sanitizeCsvCell).join(','))
        ].join('\r\n');
      } else if (type === 'products') {
        const products = await Product.findAll({
          where: { business_id: businessId },
          include: [{ model: Category, as: 'category', attributes: ['name'] }]
        });

        const headers = ['SKU', 'Barcode', 'Name', 'Category', 'Cost Price', 'Selling Price', 'Quantity', 'Unit', 'Tax Rate'];
        const rows = products.map((p) => [
          p.sku,
          p.barcode || '',
          p.name,
          p.category ? p.category.name : 'Uncategorized',
          p.cost_price,
          p.selling_price,
          p.quantity,
          p.unit,
          p.tax_rate
        ]);

        csvContent = [
          headers.map(sanitizeCsvCell).join(','),
          ...rows.map((row) => row.map(sanitizeCsvCell).join(','))
        ].join('\r\n');
      } else if (type === 'expenses') {
        const { date_from, date_to } = req.query;
        const where = { business_id: businessId };
        if (date_from && date_to) {
          where.expense_date = { [Op.between]: [date_from, date_to] };
        } else if (date_from) {
          where.expense_date = { [Op.gte]: date_from };
        } else if (date_to) {
          where.expense_date = { [Op.lte]: date_to };
        }

        const expenses = await Expense.findAll({
          where,
          order: [['expense_date', 'DESC']]
        });

        const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method'];
        const rows = expenses.map((e) => [
          e.expense_date,
          e.category,
          e.description,
          e.amount,
          e.payment_method
        ]);

        csvContent = [
          headers.map(sanitizeCsvCell).join(','),
          ...rows.map((row) => row.map(sanitizeCsvCell).join(','))
        ].join('\r\n');
      } else if (type === 'customers') {
        const customers = await Customer.findAll({
          where: { business_id: businessId },
          order: [['name', 'ASC']]
        });

        const headers = ['Name', 'Phone', 'Email', 'State', 'Tax Number', 'Outstanding Balance', 'Store Credit'];
        const rows = customers.map((c) => [
          c.name,
          c.phone || '',
          c.email || '',
          c.state || '',
          c.tax_number || '',
          c.outstanding_balance,
          c.store_credit
        ]);

        csvContent = [
          headers.map(sanitizeCsvCell).join(','),
          ...rows.map((row) => row.map(sanitizeCsvCell).join(','))
        ].join('\r\n');
      } else {
        return apiResponse.error(res, `Unknown export type: ${type}`, 400, 'INVALID_TYPE');
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvContent);
    } catch (error) {
      next(error);
    }
  }
};
