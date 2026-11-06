import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  ReceiptText, PieChart, Calendar, RefreshCw, Package, ArrowLeftRight,
  Users, Truck, CreditCard, FileSpreadsheet, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { reportService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

import { SalesReportTab } from './SalesReportTab.jsx';
import { InvoiceReportTab } from './InvoiceReportTab.jsx';
import { PurchaseReportTab } from './PurchaseReportTab.jsx';
import { ExpenseReportTab } from './ExpenseReportTab.jsx';
import { ProfitLossReportTab } from './ProfitLossReportTab.jsx';
import { InventoryReportTab } from './InventoryReportTab.jsx';
import { StockMovementReportTab } from './StockMovementReportTab.jsx';
import { CustomerReportTab } from './CustomerReportTab.jsx';
import { SupplierReportTab } from './SupplierReportTab.jsx';
import { PaymentReportTab } from './PaymentReportTab.jsx';
import { GstReportTab } from './GstReportTab.jsx';

const COLORS = ['#0B1120', '#D4AF37', '#10b981', '#f59e0b', '#B89326', '#E0C068', '#162038', '#917118'];

const REPORT_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'sales', label: 'Sales Report', icon: TrendingUp },
  { id: 'invoices', label: 'Invoice Report', icon: ReceiptText },
  { id: 'purchases', label: 'Purchase Report', icon: ShoppingCart },
  { id: 'expenses', label: 'Expense Report', icon: ReceiptText },
  { id: 'profit-loss', label: 'Profit & Loss', icon: PieChart },
  { id: 'inventory', label: 'Inventory Report', icon: Package },
  { id: 'stock-movements', label: 'Stock Movement', icon: ArrowLeftRight },
  { id: 'customers', label: 'Customer Report', icon: Users },
  { id: 'suppliers', label: 'Supplier Report', icon: Truck },
  { id: 'payments', label: 'Payment Report', icon: CreditCard },
  { id: 'gst', label: 'GST Report', icon: FileText }
];

function KPICard({ title, value, icon: Icon, color, subtitle, trend }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {trend >= 0 ? '+' : ''}{trend}% vs last period
        </div>
      )}
    </div>
  );
}

// Helper to get the first day of the current month (YYYY-MM-01)
const getFirstDayOfCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

// Helper to get today's date in local YYYY-MM-DD
const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ReportsPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '₹';

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const setTab = (tabId) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tabId);
    setSearchParams(params);
  };

  const [dateFrom, setDateFrom] = useState(getFirstDayOfCurrentMonth);
  const [dateTo, setDateTo] = useState(getTodayDate);
  const isDefaultRangeRef = useRef(true);
  const lastTodayRef = useRef(getTodayDate());

  const todayStr = getTodayDate();

  // Automatically update the default date range when the date or month changes
  useEffect(() => {
    const updateDateIfRolledOver = () => {
      const currentToday = getTodayDate();
      if (currentToday !== lastTodayRef.current) {
        lastTodayRef.current = currentToday;
        if (isDefaultRangeRef.current) {
          setDateFrom(getFirstDayOfCurrentMonth());
          setDateTo(currentToday);
        }
      }
    };

    const interval = setInterval(updateDateIfRolledOver, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateDateIfRolledOver();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleDateFromChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const today = getTodayDate();
    let clampedFrom = val > today ? today : val;
    setDateFrom(clampedFrom);
    if (dateTo && clampedFrom > dateTo) {
      setDateTo(clampedFrom);
    }
    const defaultFrom = getFirstDayOfCurrentMonth();
    isDefaultRangeRef.current = (clampedFrom === defaultFrom && dateTo === today);
  };

  const handleDateToChange = (e) => {
    const val = e.target.value;
    if (!val) return;
    const today = getTodayDate();
    let clampedTo = val > today ? today : val;
    setDateTo(clampedTo);
    if (dateFrom && clampedTo < dateFrom) {
      setDateFrom(clampedTo);
    }
    const defaultFrom = getFirstDayOfCurrentMonth();
    isDefaultRangeRef.current = (dateFrom === defaultFrom && clampedTo === today);
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingSales, setExportingSales] = useState(false);
  const [exportingProducts, setExportingProducts] = useState(false);
  const { toast } = useNotification() || {};

  const handleExport = async (type) => {
    const isSales = type === 'sales';
    const setBusy = isSales ? setExportingSales : setExportingProducts;
    try {
      setBusy(true);
      await reportService.downloadCsv(type, `${type}-report-${Date.now()}.csv`);
      if (toast?.success) {
        toast.success(`${isSales ? 'Sales' : 'Inventory'} CSV exported successfully`);
      }
    } catch (err) {
      if (toast?.error) {
        toast.error(err.message || `Failed to export ${type} CSV`);
      }
    } finally {
      setBusy(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const days = Math.max(1, Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1);
      const res = await reportService.getDashboard({ days, date_from: dateFrom, date_to: dateTo });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (currentTab === 'overview') {
      fetchData();
    }
  }, [fetchData, currentTab]);

  const summary = data?.summary || {};
  const salesTrend = data?.salesTrend || [];
  const lowStockAlerts = data?.lowStockAlerts || [];

  // Build category-like breakdown from summary
  const profitData = [
    { name: 'Revenue', value: summary.totalRevenue || 0 },
    { name: 'COGS', value: summary.cogs || 0 },
    { name: 'Expenses', value: summary.totalExpenses || 0 },
    { name: 'Net Profit', value: Math.max(0, summary.netOperatingProfit || 0) }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Financial Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Business performance overview & ledger reporting</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={dateFrom}
            max={dateTo || todayStr}
            onChange={handleDateFromChange}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={todayStr}
            onChange={handleDateToChange}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
          />
          {currentTab === 'overview' && (
            <>
              <button onClick={fetchData} className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors" title="Refresh Overview">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleExport('sales')}
                disabled={exportingSales}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle disabled:opacity-60 cursor-pointer"
              >
                {exportingSales ? 'Exporting...' : 'Export Sales CSV'}
              </button>
              <button
                type="button"
                onClick={() => handleExport('products')}
                disabled={exportingProducts}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle disabled:opacity-60 cursor-pointer"
              >
                {exportingProducts ? 'Exporting...' : 'Export Inventory CSV'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Navigation Pill Bar (Dark Navy + Golden) */}
      <div className="flex items-center gap-1.5 p-1.5 bg-[#0B1120] rounded-xl w-full border border-[#D4AF37]/40 shadow-md flex-wrap overflow-x-auto">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-[#162038]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Views */}
      {currentTab === 'overview' && (
        loading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Total Revenue" value={`${currency}${(summary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                icon={DollarSign} color="bg-emerald-50 text-emerald-600" subtitle="Net of refunds" />
              <KPICard title="Gross Profit" value={`${currency}${(summary.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                icon={TrendingUp} color="bg-[#FAF5E8] text-[#917118] border border-[#D4AF37]/30" subtitle="Revenue − COGS" />
              <KPICard title="Total Expenses" value={`${currency}${(summary.totalExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                icon={ReceiptText} color="bg-amber-50 text-amber-600" subtitle="Operational costs" />
              <KPICard title="Net Operating Profit" value={`${currency}${(summary.netOperatingProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                icon={BarChart3} color={`${(summary.netOperatingProfit || 0) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                subtitle="Gross Profit − Expenses" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Trend Chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-400" /> Sales Trend
                </h2>
                {salesTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={salesTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${currency}${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                      <Tooltip formatter={(v) => [`${currency}${v.toFixed(2)}`, 'Sales']}
                        contentStyle={{ borderRadius: 8, border: '1px solid rgba(212, 175, 55, 0.4)', backgroundColor: '#0B1120', color: '#FFFFFF', fontSize: 12 }} />
                      <Area type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2.5} fill="url(#salesGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">
                    <p className="text-sm">No sales data for selected period</p>
                  </div>
                )}
              </div>

              {/* P&L Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-slate-400" /> P&L Summary
                </h2>
                {summary.totalRevenue > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={profitData} layout="vertical" margin={{ top: 0, right: 0, left: 50, bottom: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#737373' }} axisLine={false} tickLine={false}
                          tickFormatter={v => `${currency}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#525252' }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={v => [`${currency}${v.toFixed(2)}`]} contentStyle={{ borderRadius: 8, border: '1px solid rgba(212, 175, 55, 0.4)', backgroundColor: '#0B1120', color: '#FFFFFF', fontSize: 12 }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {profitData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {profitData.map((item, i) => (
                        <div key={item.name} className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-600">{item.name}</span>
                          </div>
                          <span className="font-medium text-slate-900">{currency}{item.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data</div>
                )}
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Total Transactions</p>
                <p className="text-3xl font-bold text-slate-900">{summary.transactionsCount || 0}</p>
                <p className="text-xs text-slate-400 mt-1">Completed invoices</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">COGS</p>
                <p className="text-3xl font-bold text-slate-900">{currency}{(summary.cogs || 0).toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1">Cost of Goods Sold</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Gross Margin</p>
                <p className="text-3xl font-bold text-slate-900">
                  {summary.totalRevenue > 0
                    ? `${((summary.grossProfit / summary.totalRevenue) * 100).toFixed(1)}%`
                    : '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Gross Profit / Revenue</p>
              </div>
            </div>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                  <span className="text-amber-600 text-sm font-semibold">⚠ Low Stock Alerts</span>
                  <span className="bg-amber-200 text-amber-800 text-xs font-bold px-1.5 py-0.5 rounded">{lowStockAlerts.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#0B1120] text-[#D4AF37] border-b-2 border-[#D4AF37]/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Current Stock</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Threshold</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Selling Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {lowStockAlerts.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{p.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${p.quantity === 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                              {p.quantity} {p.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">{p.threshold}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-700">{currency}{parseFloat(p.sellingPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {currentTab === 'sales' && (
        <SalesReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}

      {currentTab === 'invoices' && (
        <InvoiceReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}

      {currentTab === 'purchases' && (
        <PurchaseReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}

      {currentTab === 'expenses' && (
        <ExpenseReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}

      {currentTab === 'profit-loss' && (
        <ProfitLossReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}

      {currentTab === 'inventory' && (
        <InventoryReportTab currency={currency} />
      )}

      {currentTab === 'stock-movements' && (
        <StockMovementReportTab dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {currentTab === 'customers' && (
        <CustomerReportTab currency={currency} />
      )}

      {currentTab === 'suppliers' && (
        <SupplierReportTab currency={currency} />
      )}

      {currentTab === 'payments' && (
        <PaymentReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}

      {currentTab === 'gst' && (
        <GstReportTab dateFrom={dateFrom} dateTo={dateTo} currency={currency} />
      )}
    </div>
  );
}
export default ReportsPage;
