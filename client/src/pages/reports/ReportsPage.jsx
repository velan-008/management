import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  ReceiptText, PieChart, Calendar, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart as RePieChart, Pie, Cell, Legend
} from 'recharts';
import { reportService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';

const COLORS = ['#0f172a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

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

export function ReportsPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '₹';

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use existing dashboard endpoint with a large period for reports
      const days = Math.max(1, Math.round((new Date(dateTo) - new Date(dateFrom)) / 86400000) + 1);
      const res = await reportService.getDashboard({ days });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-slate-500 mt-0.5">Business performance overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900" />
          <span className="text-slate-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900" />
          <button onClick={fetchData} className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a
            href="/api/reports/export/sales"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
          >
            Export Sales CSV
          </a>
          <a
            href="/api/reports/export/products"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
          >
            Export Inventory CSV
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue" value={`${currency}${(summary.totalRevenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={DollarSign} color="bg-emerald-50 text-emerald-600" subtitle="Net of refunds" />
        <KPICard title="Gross Profit" value={`${currency}${(summary.grossProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp} color="bg-blue-50 text-blue-600" subtitle="Revenue − COGS" />
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
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${currency}${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                <Tooltip formatter={(v) => [`${currency}${v.toFixed(2)}`, 'Sales']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="sales" stroke="#0f172a" strokeWidth={2} fill="url(#salesGrad)" />
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
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={v => `${currency}${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={v => [`${currency}${v.toFixed(2)}`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
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
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Current Stock</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Threshold</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Selling Price</th>
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
  );
}
