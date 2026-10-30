import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ReceiptText,
  Calendar,
  RotateCw,
  CheckCircle2,
  Truck,
  Building2,
  Users,
  Package,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { MetricCard } from '../../components/dashboard/MetricCard.jsx';
import { SalesChart } from '../../components/dashboard/SalesChart.jsx';
import { RecentTransactions } from '../../components/dashboard/RecentTransactions.jsx';
import { formatCurrency as formatCur, formatDate } from '../../utils/formatters.js';
import { Link } from 'react-router-dom';

export const DashboardPage = () => {
  const { business, user, isAdmin } = useAuth();
  const [periodDays, setPeriodDays] = useState(7);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const currency = business?.currency_symbol || '$';
  const isManagerOrAdmin = isAdmin || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await dashboardService.getMetrics(periodDays);
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve dashboard metrics from the server.');
    } finally {
      setIsLoading(false);
    }
  }, [periodDays]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatCurrency = (val) => formatCur(val, currency);

  return (
    <div className="space-y-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {isManagerOrAdmin ? 'Business Overview' : 'Staff Operations Dashboard'}
            </h2>
            <Badge variant={isManagerOrAdmin ? 'primary' : 'neutral'}>
              {user?.role || 'STAFF'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isManagerOrAdmin
              ? `Real-time financial performance, inventory valuation, and wholesale operations for ${business?.name || 'Wholesale Shop'}.`
              : `Daily counter billing, collections, and stock tracking for ${business?.name || 'Wholesale Shop'}.`}
          </p>
        </div>

        {/* Date Filter & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isManagerOrAdmin && (
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 text-xs shadow-subtle">
              <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                disabled={isLoading}
                className="bg-transparent border-none text-xs font-semibold text-slate-800 pr-2 focus:ring-0 cursor-pointer"
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={isLoading}
            icon={RotateCw}
            className={isLoading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>

          {!isManagerOrAdmin && (
            <Link to="/pos">
              <Button size="sm" icon={ShoppingBag}>
                Open Billing POS
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-rose-950">Unable to load dashboard data</h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboard}>
            Retry
          </Button>
        </div>
      )}

      {/* ADMIN & MANAGER EXTENDED WHOLESALE METRICS */}
      {isManagerOrAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-2xl text-white shadow-md">
          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>Today's Sales</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                {data?.summary?.todayBillsCount || 0} bills
              </span>
            </div>
            <p className="text-lg font-bold mt-1 text-white">
              {formatCurrency(data?.summary?.todaySales || 0)}
            </p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>Today's Purchases</span>
              <Truck className="w-3.5 h-3.5 text-indigo-300" />
            </div>
            <p className="text-lg font-bold mt-1 text-white">
              {formatCurrency(data?.summary?.todayPurchases || 0)}
            </p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>Today's Expenses</span>
              <ReceiptText className="w-3.5 h-3.5 text-amber-300" />
            </div>
            <p className="text-lg font-bold mt-1 text-white">
              {formatCurrency(data?.summary?.todayExpenses || 0)}
            </p>
          </div>

          <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
              <span>Stock Valuation (Cost)</span>
              <Package className="w-3.5 h-3.5 text-emerald-300" />
            </div>
            <p className="text-lg font-bold mt-1 text-white">
              {formatCurrency(data?.summary?.totalStockValue || 0)}
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid (Matches original contract for test compatibility) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Net Sales Revenue"
          value={formatCurrency(data?.summary?.totalRevenue)}
          subtitle="Accrual gross sales net of refunds"
          icon={DollarSign}
          iconBg="bg-emerald-50 text-emerald-600"
          isLoading={isLoading}
        />

        <MetricCard
          title="Orders Invoiced"
          value={data?.summary?.transactionsCount ?? 0}
          subtitle="Completed transactions"
          icon={CreditCard}
          iconBg="bg-indigo-50 text-indigo-600"
          isLoading={isLoading}
        />

        <MetricCard
          title="Total Operating Expenses"
          value={formatCurrency(data?.summary?.totalExpenses)}
          subtitle="Utilities, supplies, overheads"
          icon={ReceiptText}
          iconBg="bg-amber-50 text-amber-600"
          isLoading={isLoading}
        />

        {isManagerOrAdmin ? (
          <MetricCard
            title="Net Operating Profit"
            value={formatCurrency(data?.summary?.netOperatingProfit)}
            subtitle="Gross Profit minus OPEX"
            icon={TrendingUp}
            iconBg="bg-slate-100 text-slate-700"
            valueClassName={(data?.summary?.netOperatingProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            isLoading={isLoading}
          />
        ) : (
          <MetricCard
            title="Customer Outstanding"
            value={formatCurrency(data?.summary?.customerOutstanding || 0)}
            subtitle="Pending balances on credit"
            icon={Users}
            iconBg="bg-blue-50 text-blue-600"
            isLoading={isLoading}
          />
        )}
      </div>

      {/* WHOLESALE FINANCIALS & BALANCES (ADMIN ONLY) */}
      {isManagerOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Customer Receivables</p>
              <h3 className="text-xl font-bold text-rose-950 mt-1">
                {formatCurrency(data?.summary?.customerOutstanding || 0)}
              </h3>
              <p className="text-[11px] text-rose-700 mt-0.5">Total credit due from customers</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Supplier Payables</p>
              <h3 className="text-xl font-bold text-amber-950 mt-1">
                {formatCurrency(data?.summary?.supplierOutstanding || 0)}
              </h3>
              <p className="text-[11px] text-amber-700 mt-0.5">Total credit owed to suppliers</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Estimated Gross Profit</p>
              <h3 className="text-xl font-bold text-emerald-950 mt-1">
                {formatCurrency(data?.summary?.grossProfit || 0)}
              </h3>
              <p className="text-[11px] text-emerald-700 mt-0.5">Sales margin before OPEX</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Payment Collections Breakdown Bar */}
      {data?.paymentCollections && Object.keys(data.paymentCollections).length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
            Payment Collections Summary (Period)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(data.paymentCollections).map(([method, amt]) => (
              <div key={method} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="text-xs font-medium text-slate-600">{method}:</span>
                <span className="text-xs font-bold text-slate-900">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SalesChart
          salesTrend={data?.salesTrend || []}
          periodDays={periodDays}
          currency={currency}
          isLoading={isLoading}
        />

        {/* Low Stock Alerts & Expiry Alerts (1 column) */}
        <div className="space-y-4">
          <Card
            title="Low Stock Watchlist"
            subtitle="Products below reorder threshold"
            action={
              <Badge variant={data?.lowStockAlerts?.length > 0 ? 'error' : 'success'}>
                {data?.lowStockAlerts?.length || 0} Alerts
              </Badge>
            }
          >
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !data?.lowStockAlerts || data.lowStockAlerts.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="All stock levels healthy"
                description="No inventory items are currently at or below their alert threshold."
              />
            ) : (
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-56">
                {data.lowStockAlerts.map((prod) => (
                  <div key={prod.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{prod.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
                        {prod.quantity} {prod.unit}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Min: {prod.threshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Near Expiry Alerts (Wholesale packaged goods) */}
          {data?.nearExpiryAlerts && data.nearExpiryAlerts.length > 0 && (
            <Card
              title="Near-Expiry Alert"
              subtitle="Expiring within 60 days"
              action={
                <Badge variant="warning">
                  {data.nearExpiryAlerts.length} Products
                </Badge>
              }
            >
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-48">
                {data.nearExpiryAlerts.map((prod) => (
                  <div key={prod.id} className="py-2 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-[10px] text-amber-700">Batch: {prod.batchNumber || 'N/A'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                        {prod.expiryDate}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{prod.quantity} {prod.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Purchases Row (Admin only) */}
      {isManagerOrAdmin && data?.recentPurchases && data.recentPurchases.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Wholesale Purchases</h3>
              <p className="text-xs text-slate-500">Inbound supplier shipments and bills</p>
            </div>
            <Link to="/purchases" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View All Purchases &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">PO / Bill #</th>
                  <th className="py-2 px-3">Supplier</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Total Amount</th>
                  <th className="py-2 px-3">Goods Status</th>
                  <th className="py-2 px-3">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentPurchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-bold text-indigo-600">{po.invoiceNumber}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{po.supplierName}</td>
                    <td className="py-2 px-3 text-slate-500">{formatDate(po.purchaseDate)}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{formatCurrency(po.grandTotal)}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        po.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        po.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {po.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Sales Transactions Table */}
      <RecentTransactions
        transactions={data?.recentTransactions || []}
        currency={currency}
        isLoading={isLoading}
      />
    </div>
  );
};
