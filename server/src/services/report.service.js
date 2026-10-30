import { Op, Sequelize } from 'sequelize';
import {
  Sale, SaleItem, Product, Customer, Expense, User, StockMovement, Supplier, Purchase, Payment
} from '../models/index.js';

/**
 * Sanitize CSV cell values against CSV injection / formula injection
 * Vulnerable prefixes: '=', '+', '-', '@', '\t', '\r'
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str.replace(/"/g, '""')}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const reportService = {
  /**
   * Generates real-time dashboard KPIs computed directly from database records
   */
  getDashboardMetrics: async (businessId, periodDays = 7) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (periodDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // 1. Fetch completed or partially refunded sales for business
    const sales = await Sale.findAll({
      where: {
        business_id: businessId,
        status: {
          [Op.in]: ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED']
        }
      },
      include: [
        {
          model: SaleItem,
          as: 'items'
        }
      ]
    });

    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let totalDiscounts = 0;
    let totalCOGS = 0;
    let totalTaxableSales = 0;

    for (const sale of sales) {
      const grandTotal = parseFloat(sale.grand_total) || 0;
      const orderDiscount = parseFloat(sale.order_discount) || 0;
      const taxTotal = parseFloat(sale.tax_total) || 0;
      const refunded = parseFloat(sale.refunded_amount) || 0;

      totalRevenue += (grandTotal - refunded);
      totalTaxCollected += taxTotal;
      totalDiscounts += orderDiscount;

      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          const qty = item.quantity - (item.refunded_quantity || 0);
          const cost = parseFloat(item.unit_cost_price) || 0;
          const taxable = parseFloat(item.taxable_amount) || 0;

          totalCOGS += (qty * cost);
          totalTaxableSales += taxable;
        }
      }
    }

    // 2. Fetch expenses
    const expenses = await Expense.findAll({
      where: { business_id: businessId }
    });

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (parseFloat(exp.amount) || 0),
      0
    );

    // Accounting computations
    const netSales = Math.max(0, totalTaxableSales - totalDiscounts);
    const grossProfit = netSales - totalCOGS;
    const netOperatingProfit = grossProfit - totalExpenses;

    // 3. Low stock alert items (quantity <= low_stock_threshold)
    const lowStockProducts = await Product.findAll({
      where: {
        business_id: businessId,
        is_active: true,
        quantity: {
          [Op.lte]: Sequelize.col('low_stock_threshold')
        }
      },
      attributes: ['id', 'name', 'sku', 'quantity', 'low_stock_threshold', 'selling_price', 'unit'],
      order: [['quantity', 'ASC']],
      limit: 10
    });

    // 4. Last N-day daily trend
    const salesLastDays = await Sale.findAll({
      where: {
        business_id: businessId,
        invoice_date: {
          [Op.gte]: startDate.toISOString().split('T')[0]
        },
        status: {
          [Op.in]: ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED']
        }
      },
      attributes: ['invoice_date', 'grand_total', 'refunded_amount'],
      order: [['invoice_date', 'ASC']]
    });

    // Bucket sales by date
    const trendMap = {};
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      trendMap[dateStr] = { date: dateStr, label, sales: 0, orders: 0 };
    }

    for (const s of salesLastDays) {
      if (trendMap[s.invoice_date]) {
        const netSale = (parseFloat(s.grand_total) || 0) - (parseFloat(s.refunded_amount) || 0);
        trendMap[s.invoice_date].sales += Math.round(netSale * 100) / 100;
        trendMap[s.invoice_date].orders += 1;
      }
    }

    const salesTrend = Object.values(trendMap);

    // 5. Recent transactions
    const recentTransactions = await Sale.findAll({
      where: { business_id: businessId },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'cashier',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 6
    });

    // 6. Wholesale & Today Specific Metrics
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySalesList = sales.filter((s) => s.invoice_date === todayStr);
    const todaySales = todaySalesList.reduce((sum, s) => sum + (parseFloat(s.grand_total) || 0) - (parseFloat(s.refunded_amount) || 0), 0);
    const todayBillsCount = todaySalesList.length;

    const todayExpensesList = expenses.filter((e) => e.expense_date === todayStr);
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // Today's purchases
    const purchasesToday = await Purchase.findAll({
      where: { business_id: businessId, purchase_date: todayStr }
    });
    const todayPurchases = purchasesToday.reduce((sum, p) => sum + (parseFloat(p.grand_total) || 0), 0);

    // Total active inventory valuation
    const allProducts = await Product.findAll({
      where: { business_id: businessId, is_active: true },
      attributes: ['id', 'quantity', 'cost_price', 'selling_price', 'wholesale_price', 'expiry_date', 'name', 'sku']
    });

    let totalStockValue = 0;
    let totalStockRetailValue = 0;
    const nearExpiryList = [];
    const in60Days = new Date();
    in60Days.setDate(in60Days.getDate() + 60);

    for (const p of allProducts) {
      const q = p.quantity || 0;
      totalStockValue += q * (parseFloat(p.cost_price) || 0);
      totalStockRetailValue += q * (parseFloat(p.selling_price) || 0);

      if (p.expiry_date) {
        const exp = new Date(p.expiry_date);
        if (exp <= in60Days) {
          nearExpiryList.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            quantity: p.quantity,
            expiryDate: p.expiry_date
          });
        }
      }
    }

    // Customer Receivables (Total outstanding balance)
    const customers = await Customer.findAll({
      where: { business_id: businessId },
      attributes: ['outstanding_balance']
    });
    const totalCustomerOutstanding = customers.reduce((sum, c) => sum + (parseFloat(c.outstanding_balance) || 0), 0);

    // Supplier Payables (Total outstanding balance)
    const suppliers = await Supplier.findAll({
      where: { business_id: businessId },
      attributes: ['outstanding_balance']
    });
    const totalSupplierOutstanding = suppliers.reduce((sum, s) => sum + (parseFloat(s.outstanding_balance) || 0), 0);

    // Payment collection breakdown
    const allPayments = await Payment.findAll({
      where: { business_id: businessId }
    });
    const paymentCollections = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      OTHER: 0
    };
    for (const p of allPayments) {
      const meth = p.payment_method || 'CASH';
      paymentCollections[meth] = (paymentCollections[meth] || 0) + (parseFloat(p.amount) || 0);
    }

    // Recent purchases
    const recentPurchases = await Purchase.findAll({
      where: { business_id: businessId },
      include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        transactionsCount: sales.length,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        cogs: Math.round(totalCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netOperatingProfit: Math.round(netOperatingProfit * 100) / 100,
        lowStockCount: lowStockProducts.length,
        // Wholesale extensions
        todaySales: Math.round(todaySales * 100) / 100,
        todayBillsCount,
        todayPurchases: Math.round(todayPurchases * 100) / 100,
        todayExpenses: Math.round(todayExpenses * 100) / 100,
        totalStockValue: Math.round(totalStockValue * 100) / 100,
        totalStockRetailValue: Math.round(totalStockRetailValue * 100) / 100,
        customerOutstanding: Math.round(totalCustomerOutstanding * 100) / 100,
        supplierOutstanding: Math.round(totalSupplierOutstanding * 100) / 100,
        nearExpiryCount: nearExpiryList.length
      },
      salesTrend,
      paymentCollections,
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice_number,
        supplierName: p.supplier ? p.supplier.name : 'Supplier',
        grandTotal: parseFloat(p.grand_total) || 0,
        status: p.status,
        paymentStatus: p.payment_status,
        purchaseDate: p.purchase_date
      })),
      recentTransactions: recentTransactions.map((s) => ({
        id: s.id,
        invoiceNumber: s.invoice_number,
        invoiceDate: s.invoice_date,
        customerName: s.customer ? s.customer.name : 'Walk-in Customer',
        grandTotal: parseFloat(s.grand_total) || 0,
        paidAmount: parseFloat(s.paid_amount) || 0,
        balanceDue: parseFloat(s.balance_due) || 0,
        paymentStatus: s.payment_status,
        status: s.status,
        cashierName: s.cashier ? s.cashier.name : 'Staff'
      })),
      lowStockAlerts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        threshold: p.low_stock_threshold,
        unit: p.unit,
        sellingPrice: parseFloat(p.selling_price) || 0
      })),
      nearExpiryAlerts: nearExpiryList
    };
  },

  /**
   * Profit & Loss statement for date range
   */
  getProfitLossReport: async (businessId, dateFrom, dateTo) => {
    const where = {
      business_id: businessId,
      status: { [Op.in]: ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'] }
    };
    if (dateFrom || dateTo) {
      where.invoice_date = {};
      if (dateFrom) where.invoice_date[Op.gte] = dateFrom;
      if (dateTo) where.invoice_date[Op.lte] = dateTo;
    }

    const sales = await Sale.findAll({
      where,
      include: [{ model: SaleItem, as: 'items' }]
    });

    let grossSales = 0;
    let discounts = 0;
    let taxCollected = 0;
    let cogs = 0;
    let refunded = 0;

    for (const s of sales) {
      grossSales += (parseFloat(s.subtotal) || 0);
      discounts += (parseFloat(s.discount_total) || 0);
      taxCollected += (parseFloat(s.tax_total) || 0);
      refunded += (parseFloat(s.refunded_amount) || 0);

      if (s.items) {
        for (const item of s.items) {
          const qty = item.quantity - (item.refunded_quantity || 0);
          cogs += qty * (parseFloat(item.unit_cost_price) || 0);
        }
      }
    }

    const netSales = Math.max(0, grossSales - discounts - refunded);
    const grossProfit = netSales - cogs;

    const expWhere = { business_id: businessId };
    if (dateFrom || dateTo) {
      expWhere.expense_date = {};
      if (dateFrom) expWhere.expense_date[Op.gte] = dateFrom;
      if (dateTo) expWhere.expense_date[Op.lte] = dateTo;
    }

    const expenses = await Expense.findAll({ where: expWhere });
    const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    return {
      dateRange: { dateFrom: dateFrom || 'Beginning', dateTo: dateTo || 'Present' },
      revenue: {
        grossSales: Math.round(grossSales * 100) / 100,
        discounts: Math.round(discounts * 100) / 100,
        refunds: Math.round(refunded * 100) / 100,
        netSales: Math.round(netSales * 100) / 100,
        taxCollected: Math.round(taxCollected * 100) / 100
      },
      costOfGoodsSold: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      operatingExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100
    };
  },

  /**
   * Aggregated sales summary report
   */
  getSalesSummary: async (businessId, dateFrom, dateTo) => {
    const where = { business_id: businessId };
    if (dateFrom || dateTo) {
      where.invoice_date = {};
      if (dateFrom) where.invoice_date[Op.gte] = dateFrom;
      if (dateTo) where.invoice_date[Op.lte] = dateTo;
    }

    const sales = await Sale.findAll({
      where,
      order: [['invoice_date', 'ASC']]
    });

    const summaryByDate = {};
    for (const s of sales) {
      const d = s.invoice_date;
      if (!summaryByDate[d]) {
        summaryByDate[d] = {
          date: d,
          invoicesCount: 0,
          grossTotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          paidAmount: 0,
          balanceDue: 0
        };
      }
      summaryByDate[d].invoicesCount += 1;
      summaryByDate[d].grossTotal += (parseFloat(s.grand_total) || 0);
      summaryByDate[d].discountTotal += (parseFloat(s.discount_total) || 0);
      summaryByDate[d].taxTotal += (parseFloat(s.tax_total) || 0);
      summaryByDate[d].paidAmount += (parseFloat(s.paid_amount) || 0);
      summaryByDate[d].balanceDue += (parseFloat(s.balance_due) || 0);
    }

    return {
      totalInvoices: sales.length,
      records: Object.values(summaryByDate).map((r) => ({
        ...r,
        grossTotal: Math.round(r.grossTotal * 100) / 100,
        discountTotal: Math.round(r.discountTotal * 100) / 100,
        taxTotal: Math.round(r.taxTotal * 100) / 100,
        paidAmount: Math.round(r.paidAmount * 100) / 100,
        balanceDue: Math.round(r.balanceDue * 100) / 100
      }))
    };
  },

  /**
   * Inventory valuation & health report
   */
  getInventoryReport: async (businessId) => {
    const products = await Product.findAll({
      where: { business_id: businessId }
    });

    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      const qty = p.quantity || 0;
      const cost = parseFloat(p.cost_price) || 0;
      const retail = parseFloat(p.selling_price) || 0;

      totalCostValuation += (qty * cost);
      totalRetailValuation += (qty * retail);

      if (qty <= 0) outOfStockCount++;
      else if (qty <= p.low_stock_threshold) lowStockCount++;
    }

    const potentialProfit = Math.max(0, totalRetailValuation - totalCostValuation);

    return {
      totalProducts: products.length,
      totalCostValuation: Math.round(totalCostValuation * 100) / 100,
      totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      lowStockCount,
      outOfStockCount
    };
  }
};
