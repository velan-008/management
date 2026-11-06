import { Op, Sequelize } from 'sequelize';
import {
  Sale, SaleItem, Product, Customer, Expense, User, StockMovement, Supplier, Purchase, Payment, Business
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
  getDashboardMetrics: async (businessId, periodDays = 7, dateFrom = null, dateTo = null) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let startDateStr;
    let endDateStr;

    if (dateFrom && dateTo) {
      // Disallow future dates and ensure proper range
      endDateStr = dateTo > todayStr ? todayStr : dateTo;
      startDateStr = dateFrom > endDateStr ? endDateStr : dateFrom;
    } else {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (periodDays - 1));
      startDate.setHours(0, 0, 0, 0);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = todayStr;
    }

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

    // Filter sales and expenses for the selected period (e.g. Last 7 Days, 14 Days, 30 Days, or custom date range)
    const periodSales = sales.filter((s) => s.invoice_date >= startDateStr && s.invoice_date <= endDateStr);

    let periodRevenue = 0;
    let periodTaxCollected = 0;
    let periodDiscounts = 0;
    let periodCOGS = 0;
    let periodTaxableSales = 0;

    for (const sale of periodSales) {
      const grandTotal = parseFloat(sale.grand_total) || 0;
      const orderDiscount = parseFloat(sale.order_discount) || 0;
      const taxTotal = parseFloat(sale.tax_total) || 0;
      const refunded = parseFloat(sale.refunded_amount) || 0;

      periodRevenue += (grandTotal - refunded);
      periodTaxCollected += taxTotal;
      periodDiscounts += orderDiscount;

      if (sale.items && sale.items.length > 0) {
        for (const item of sale.items) {
          const qty = item.quantity - (item.refunded_quantity || 0);
          const cost = parseFloat(item.unit_cost_price) || 0;
          const taxable = parseFloat(item.taxable_amount) || 0;

          periodCOGS += (qty * cost);
          periodTaxableSales += taxable;
        }
      }
    }

    // All-time revenue for total business context
    let allTimeRevenue = 0;
    for (const sale of sales) {
      const grandTotal = parseFloat(sale.grand_total) || 0;
      const refunded = parseFloat(sale.refunded_amount) || 0;
      allTimeRevenue += (grandTotal - refunded);
    }

    // 2. Fetch expenses
    const expenses = await Expense.findAll({
      where: { business_id: businessId }
    });

    const periodExpenses = expenses.filter((e) => e.expense_date >= startDateStr && e.expense_date <= endDateStr);
    const periodTotalExpenses = periodExpenses.reduce(
      (sum, exp) => sum + (parseFloat(exp.amount) || 0),
      0
    );
    const allTimeTotalExpenses = expenses.reduce(
      (sum, exp) => sum + (parseFloat(exp.amount) || 0),
      0
    );

    // Accounting computations for the period
    const netSales = Math.max(0, periodTaxableSales - periodDiscounts);
    const grossProfit = netSales - periodCOGS;
    const netOperatingProfit = grossProfit - periodTotalExpenses;

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

    // 4. Daily trend for the selected period
    const salesLastDays = await Sale.findAll({
      where: {
        business_id: businessId,
        invoice_date: {
          [Op.gte]: startDateStr,
          [Op.lte]: endDateStr
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
    if (dateFrom && dateTo) {
      const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
      const [eYear, eMonth, eDay] = endDateStr.split('-').map(Number);
      const curr = new Date(sYear, sMonth - 1, sDay);
      const end = new Date(eYear, eMonth - 1, eDay);
      let safetyCounter = 0;
      while (curr <= end && safetyCounter < 366) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const label = curr.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        trendMap[dateStr] = { date: dateStr, label, sales: 0, orders: 0 };
        curr.setDate(curr.getDate() + 1);
        safetyCounter++;
      }
    } else {
      for (let i = periodDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        trendMap[dateStr] = { date: dateStr, label, sales: 0, orders: 0 };
      }
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

    // 6. Wholesale & Today Specific Metrics (support both UTC and local date comparisons)
    const todayUtc = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = (d) => d === todayUtc || d === todayLocal;

    const todaySalesList = sales.filter((s) => isToday(s.invoice_date) || (s.createdAt && isToday(new Date(s.createdAt).toISOString().slice(0, 10))));
    const todaySales = todaySalesList.reduce((sum, s) => sum + (parseFloat(s.grand_total) || 0) - (parseFloat(s.refunded_amount) || 0), 0);
    const todayBillsCount = todaySalesList.length;

    const todayExpensesList = expenses.filter((e) => isToday(e.expense_date) || (e.createdAt && isToday(new Date(e.createdAt).toISOString().slice(0, 10))));
    const todayExpenses = todayExpensesList.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    // Today's purchases
    const purchasesToday = await Purchase.findAll({
      where: {
        business_id: businessId,
        purchase_date: {
          [Op.in]: [todayUtc, todayLocal]
        }
      }
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

    // Customer Receivables (Total outstanding balance from customer profiles or sales balance due)
    const customers = await Customer.findAll({
      where: { business_id: businessId },
      attributes: ['outstanding_balance']
    });
    const customerBalanceSum = customers.reduce((sum, c) => sum + (parseFloat(c.outstanding_balance) || 0), 0);
    const saleBalanceSum = (await Sale.sum('balance_due', {
      where: {
        business_id: businessId,
        payment_status: { [Op.in]: ['UNPAID', 'PARTIALLY_PAID'] },
        status: { [Op.ne]: 'CANCELLED' }
      }
    })) || 0;
    const totalCustomerOutstanding = Math.max(customerBalanceSum, parseFloat(saleBalanceSum) || 0);

    // Supplier Payables (Total outstanding balance from supplier profiles or purchase balance due)
    const suppliers = await Supplier.findAll({
      where: { business_id: businessId },
      attributes: ['outstanding_balance']
    });
    const supplierBalanceSum = suppliers.reduce((sum, s) => sum + (parseFloat(s.outstanding_balance) || 0), 0);
    const purchaseBalanceSum = (await Purchase.sum('balance_due', {
      where: {
        business_id: businessId,
        payment_status: { [Op.in]: ['UNPAID', 'PARTIALLY_PAID'] },
        status: { [Op.ne]: 'CANCELLED' }
      }
    })) || 0;
    const totalSupplierOutstanding = Math.max(supplierBalanceSum, parseFloat(purchaseBalanceSum) || 0);

    // Payment collection breakdown (for the selected period based on actual records)
    const paymentWhere = {
      business_id: businessId
    };
    if (startDateStr && endDateStr) {
      paymentWhere[Op.and] = [
        Sequelize.where(Sequelize.fn('DATE', Sequelize.col('payment_date')), {
          [Op.between]: [startDateStr, endDateStr]
        })
      ];
    }
    const periodPayments = await Payment.findAll({
      where: paymentWhere
    });
    const paymentCollections = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      BANK_TRANSFER: 0,
      OTHER: 0
    };
    for (const p of periodPayments) {
      const meth = (p.payment_method || 'CASH').toUpperCase();
      const amt = parseFloat(p.amount) || 0;
      if (meth === 'CREDIT') {
        continue; // CREDIT tender represents trade receivable, not cash/bank receipt
      }
      if (paymentCollections[meth] !== undefined) {
        paymentCollections[meth] += amt;
      } else {
        paymentCollections.OTHER += amt;
      }
    }
    for (const k of Object.keys(paymentCollections)) {
      paymentCollections[k] = Math.round(paymentCollections[k] * 100) / 100;
    }

    // Purchases for the selected period
    const purchasesPeriod = await Purchase.findAll({
      where: {
        business_id: businessId,
        purchase_date: {
          [Op.between]: [startDateStr, endDateStr]
        },
        status: { [Op.ne]: 'CANCELLED' }
      }
    });
    const periodPurchases = purchasesPeriod.reduce((sum, p) => sum + (parseFloat(p.grand_total) || 0), 0);

    // Recent purchases
    const recentPurchases = await Purchase.findAll({
      where: { business_id: businessId },
      include: [{ model: Supplier, as: 'supplier', attributes: ['name'] }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    return {
      summary: {
        totalRevenue: Math.round(periodRevenue * 100) / 100,
        transactionsCount: periodSales.length,
        periodRevenue: Math.round(periodRevenue * 100) / 100,
        periodOrdersCount: periodSales.length,
        allTimeRevenue: Math.round(allTimeRevenue * 100) / 100,
        allTimeTransactionsCount: sales.length,
        totalExpenses: Math.round(periodTotalExpenses * 100) / 100,
        allTimeExpenses: Math.round(allTimeTotalExpenses * 100) / 100,
        cogs: Math.round(periodCOGS * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netOperatingProfit: Math.round(netOperatingProfit * 100) / 100,
        lowStockCount: lowStockProducts.length,
        periodDays,
        // Wholesale extensions
        periodPurchases: Math.round(periodPurchases * 100) / 100,
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
  },

  /**
   * Payments collection register report
   */
  getPaymentsReport: async (businessId, query = {}) => {
    const { page = 1, limit = 20, date_from, date_to, payment_method, search = '' } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = { business_id: businessId };
    if (payment_method && payment_method !== 'ALL') {
      where.payment_method = payment_method;
    }
    if (date_from && date_to) {
      where[Op.and] = [
        Sequelize.where(Sequelize.fn('DATE', Sequelize.col('Payment.payment_date')), {
          [Op.between]: [date_from, date_to]
        })
      ];
    } else if (date_from) {
      where[Op.and] = [
        Sequelize.where(Sequelize.fn('DATE', Sequelize.col('Payment.payment_date')), {
          [Op.gte]: date_from
        })
      ];
    } else if (date_to) {
      where[Op.and] = [
        Sequelize.where(Sequelize.fn('DATE', Sequelize.col('Payment.payment_date')), {
          [Op.lte]: date_to
        })
      ];
    }

    if (search && search.trim()) {
      where[Op.or] = [
        { reference_number: { [Op.like]: `%${search.trim()}%` } },
        { notes: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Sale,
          as: 'sale',
          attributes: ['id', 'invoice_number', 'invoice_date', 'customer_id'],
          include: [
            {
              model: Customer,
              as: 'customer',
              attributes: ['id', 'name', 'phone']
            }
          ]
        }
      ],
      order: [['payment_date', 'DESC'], ['id', 'DESC']],
      limit: limitNum,
      offset
    });

    const allFiltered = await Payment.findAll({
      where,
      attributes: ['payment_method', 'amount']
    });

    let totalAmount = 0;
    const byMethod = { CASH: 0, UPI: 0, CARD: 0, BANK_TRANSFER: 0, CREDIT: 0, OTHER: 0 };
    for (const p of allFiltered) {
      const amt = parseFloat(p.amount) || 0;
      totalAmount += amt;
      const m = (p.payment_method || 'OTHER').toUpperCase();
      if (byMethod[m] !== undefined) byMethod[m] += amt;
      else byMethod.OTHER += amt;
    }

    return {
      payments: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      summary: {
        totalAmount: Math.round(totalAmount * 100) / 100,
        byMethod
      }
    };
  },

  /**
   * Statutory GST report with CGST, SGST, IGST breakdown
   */
  getGstReport: async (businessId, query = {}) => {
    const { page = 1, limit = 20, date_from, date_to, search = '' } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = {
      business_id: businessId,
      status: { [Op.in]: ['COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'] }
    };

    if (date_from && date_to) {
      where.invoice_date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
      where.invoice_date = { [Op.gte]: date_from };
    } else if (date_to) {
      where.invoice_date = { [Op.lte]: date_to };
    }

    if (search && search.trim()) {
      where.invoice_number = { [Op.like]: `%${search.trim()}%` };
    }

    const { count, rows } = await Sale.findAndCountAll({
      where,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'tax_number', 'state', 'phone'],
          required: false
        },
        {
          model: Business,
          as: 'business',
          attributes: ['id', 'name', 'state', 'tax_number'],
          required: false
        }
      ],
      order: [['invoice_date', 'DESC'], ['id', 'DESC']],
      limit: limitNum,
      offset
    });

    const allFiltered = await Sale.findAll({
      where,
      attributes: ['subtotal', 'discount_total', 'tax_total', 'cgst_total', 'sgst_total', 'igst_total', 'grand_total', 'refunded_amount']
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let totalInvoiceAmount = 0;

    for (const s of allFiltered) {
      const sub = parseFloat(s.subtotal) || 0;
      const disc = parseFloat(s.discount_total) || 0;
      totalTaxable += Math.max(0, sub - disc);
      totalCgst += parseFloat(s.cgst_total) || 0;
      totalSgst += parseFloat(s.sgst_total) || 0;
      totalIgst += parseFloat(s.igst_total) || 0;
      totalTax += parseFloat(s.tax_total) || 0;
      totalInvoiceAmount += (parseFloat(s.grand_total) || 0) - (parseFloat(s.refunded_amount) || 0);
    }

    return {
      records: rows.map(s => {
        const sub = parseFloat(s.subtotal) || 0;
        const disc = parseFloat(s.discount_total) || 0;
        const taxable = Math.max(0, sub - disc);
        const isInterState = parseFloat(s.igst_total || 0) > 0;
        return {
          id: s.id,
          invoice_number: s.invoice_number,
          invoice_date: s.invoice_date,
          customer_name: s.customer ? s.customer.name : 'Walk-in Customer',
          customer_gstin: s.customer ? (s.customer.tax_number || 'URP') : 'URP',
          place_of_supply: s.customer?.state || s.business?.state || 'Local',
          transaction_type: isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)',
          taxable_amount: Math.round(taxable * 100) / 100,
          cgst_amount: parseFloat(s.cgst_total) || 0,
          sgst_amount: parseFloat(s.sgst_total) || 0,
          igst_amount: parseFloat(s.igst_total) || 0,
          tax_amount: parseFloat(s.tax_total) || 0,
          grand_total: parseFloat(s.grand_total) || 0
        };
      }),
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      summary: {
        totalTaxable: Math.round(totalTaxable * 100) / 100,
        totalCgst: Math.round(totalCgst * 100) / 100,
        totalSgst: Math.round(totalSgst * 100) / 100,
        totalIgst: Math.round(totalIgst * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalInvoiceAmount: Math.round(totalInvoiceAmount * 100) / 100
      }
    };
  },

  /**
   * Customer receivables & sales report
   */
  getCustomersReport: async (businessId, query = {}) => {
    const { page = 1, limit = 20, search = '', customer_type } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = { business_id: businessId };
    if (customer_type && customer_type !== 'ALL') where.customer_type = customer_type;
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { count, rows } = await Customer.findAndCountAll({
      where,
      include: [
        {
          model: Sale,
          as: 'sales',
          attributes: ['id', 'grand_total', 'paid_amount', 'balance_due', 'status'],
          where: { status: { [Op.ne]: 'CANCELLED' } },
          required: false
        }
      ],
      order: [['name', 'ASC']],
      limit: limitNum,
      offset
    });

    const records = rows.map(c => {
      const sales = c.sales || [];
      const totalSalesAmt = sales.reduce((sum, s) => sum + (parseFloat(s.grand_total) || 0), 0);
      const totalPaid = sales.reduce((sum, s) => sum + (parseFloat(s.paid_amount) || 0), 0);
      const currentOutstanding = parseFloat(c.outstanding_balance) || 0;
      const creditLimit = parseFloat(c.credit_limit) || 0;
      let status = 'GOOD';
      if (creditLimit > 0 && currentOutstanding >= creditLimit) status = 'OVER_LIMIT';
      else if (creditLimit > 0 && currentOutstanding >= creditLimit * 0.8) status = 'NEAR_LIMIT';

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        customer_type: c.customer_type,
        state: c.state || '-',
        credit_limit: creditLimit,
        outstanding_balance: currentOutstanding,
        total_invoices: sales.length,
        total_sales_amount: Math.round(totalSalesAmt * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        credit_status: status
      };
    });

    const allCustomers = await Customer.findAll({
      where: { business_id: businessId },
      attributes: ['outstanding_balance', 'credit_limit']
    });
    const totalOutstanding = allCustomers.reduce((sum, c) => sum + (parseFloat(c.outstanding_balance) || 0), 0);
    const overLimitCount = allCustomers.filter(c => parseFloat(c.credit_limit) > 0 && parseFloat(c.outstanding_balance) >= parseFloat(c.credit_limit)).length;

    return {
      customers: records,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      summary: {
        totalCustomers: count,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        overLimitCount
      }
    };
  },

  /**
   * Supplier payables & purchases report
   */
  getSuppliersReport: async (businessId, query = {}) => {
    const { page = 1, limit = 20, search = '' } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = { business_id: businessId };
    if (search && search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search.trim()}%` } },
        { contact_person: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } },
        { tax_number: { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { count, rows } = await Supplier.findAndCountAll({
      where,
      include: [
        {
          model: Purchase,
          as: 'purchases',
          attributes: ['id', 'grand_total', 'paid_amount', 'balance_due', 'status'],
          where: { status: { [Op.ne]: 'CANCELLED' } },
          required: false
        }
      ],
      order: [['name', 'ASC']],
      limit: limitNum,
      offset
    });

    const records = rows.map(s => {
      const purchases = s.purchases || [];
      const totalPurchaseAmt = purchases.reduce((sum, p) => sum + (parseFloat(p.grand_total) || 0), 0);
      const totalPaid = purchases.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
      const outstanding = parseFloat(s.outstanding_balance) || 0;

      return {
        id: s.id,
        name: s.name,
        contact_person: s.contact_person,
        phone: s.phone,
        email: s.email,
        gstin: s.tax_number || '-',
        total_purchases_count: purchases.length,
        total_purchases_amount: Math.round(totalPurchaseAmt * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        outstanding_balance: outstanding
      };
    });

    const allSuppliers = await Supplier.findAll({
      where: { business_id: businessId },
      attributes: ['outstanding_balance']
    });
    const totalPayables = allSuppliers.reduce((sum, s) => sum + (parseFloat(s.outstanding_balance) || 0), 0);

    return {
      suppliers: records,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      summary: {
        totalSuppliers: count,
        totalPayables: Math.round(totalPayables * 100) / 100
      }
    };
  },

  /**
   * Operating Expenses Register & Breakdown Report
   */
  getExpensesReport: async (businessId, query = {}) => {
    const { page = 1, limit = 20, date_from, date_to, category, payment_method, search = '' } = query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const where = { business_id: businessId };

    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (payment_method && payment_method !== 'ALL') {
      where.payment_method = payment_method;
    }

    if (date_from && date_to) {
      where.expense_date = { [Op.between]: [date_from, date_to] };
    } else if (date_from) {
      where.expense_date = { [Op.gte]: date_from };
    } else if (date_to) {
      where.expense_date = { [Op.lte]: date_to };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { description: { [Op.like]: q } },
        { category: { [Op.like]: q } }
      ];
    }

    const { count, rows } = await Expense.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['expense_date', 'DESC'], ['id', 'DESC']],
      limit: limitNum,
      offset
    });

    // Compute accurate totals across ALL matching records (not just the current page)
    const allFiltered = await Expense.findAll({
      where,
      attributes: ['category', 'amount', 'payment_method']
    });

    let totalExpenses = 0;
    const categoryTotals = {};
    const methodTotals = {};

    for (const exp of allFiltered) {
      const amt = parseFloat(exp.amount) || 0;
      totalExpenses += amt;

      const cat = exp.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;

      const method = exp.payment_method || 'CASH';
      methodTotals[method] = (methodTotals[method] || 0) + amt;
    }

    let highestCategory = 'None';
    let highestCategoryAmount = 0;
    for (const [cat, amt] of Object.entries(categoryTotals)) {
      if (amt > highestCategoryAmount) {
        highestCategoryAmount = amt;
        highestCategory = cat;
      }
    }

    const avgExpense = allFiltered.length > 0 ? (totalExpenses / allFiltered.length) : 0;

    return {
      expenses: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalCount: count,
        avgExpense: Math.round(avgExpense * 100) / 100,
        highestCategory,
        highestCategoryAmount: Math.round(highestCategoryAmount * 100) / 100,
        categoryTotals,
        methodTotals
      }
    };
  }
};
