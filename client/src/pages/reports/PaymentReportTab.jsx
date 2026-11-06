import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function PaymentReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search,
        date_from: dateFrom,
        date_to: dateTo
      };
      if (methodFilter !== 'ALL') params.payment_method = methodFilter;
      const res = await reportService.getPayments(params);
      const data = res?.data || res || {};
      setPayments(data.payments || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch payments report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, methodFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleExportExcel = () => {
    const headers = ['Ref #', 'Payment Date', 'Invoice #', 'Customer', 'Method', 'Amount', 'Status', 'Notes'];
    const rows = payments.map((p) => [
      p.reference_number || `PAY-${p.id}`,
      p.payment_date ? new Date(p.payment_date).toLocaleString('en-IN') : '-',
      p.sale?.invoice_number || '-',
      p.sale?.customer?.name || 'Walk-in Customer',
      p.payment_method,
      parseFloat(p.amount || 0).toFixed(2),
      p.status || 'COMPLETED',
      p.notes || '-'
    ]);
    exportTableToCsv(`Payment-Register-Report-${Date.now()}`, headers, rows);
  };

  const handlePrint = () => {
    printReport('Payment Collection Register Report', 'payment-report-printable');
  };

  const byMethod = summary?.byMethod || {};

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportStatPill
          title="Total Collected"
          value={`${currency}${(summary?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="All payment tenders"
          icon="credit-card"
        />
        <ReportStatPill
          title="Cash Collections"
          value={`${currency}${(byMethod.CASH || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Physical cash received"
          icon="dollar-sign"
        />
        <ReportStatPill
          title="UPI Collections"
          value={`${currency}${(byMethod.UPI || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Instant QR / VPA transfers"
          icon="trending-up"
        />
        <ReportStatPill
          title="Card & Others"
          value={`${currency}${((byMethod.CARD || 0) + (byMethod.BANK_TRANSFER || 0) + (byMethod.OTHER || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="POS terminal / Bank"
          icon="activity"
        />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        title="Payment Collection Register"
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search ref #, notes..."
        filterValue={methodFilter}
        onFilterChange={(val) => { setMethodFilter(val); setPage(1); }}
        filterOptions={[
          { label: 'All Methods', value: 'ALL' },
          { label: 'Cash Only', value: 'CASH' },
          { label: 'UPI Only', value: 'UPI' },
          { label: 'Card Only', value: 'CARD' },
          { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
          { label: 'Credit', value: 'CREDIT' }
        ]}
        onRefresh={fetchPayments}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        loading={loading}
      />

      {/* Printable / Viewable Table */}
      <div id="payment-report-printable" className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-900/50">
                <th className="py-3.5 px-4 font-semibold">Ref #</th>
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Method</th>
                <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#D4AF37] border-t-transparent mb-2"></div>
                    <div>Loading payments collection register...</div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No payment records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const methodColors = {
                    CASH: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    UPI: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
                    CARD: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                    BANK_TRANSFER: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
                    CREDIT: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  };
                  const colorCls = methodColors[p.payment_method] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                        {p.reference_number || `PAY-${p.id}`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-xs">
                        {p.payment_date ? new Date(p.payment_date).toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-100">
                        {p.sale?.invoice_number || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        <div>{p.sale?.customer?.name || 'Walk-in Customer'}</div>
                        {p.sale?.customer?.phone && (
                          <div className="text-xs text-slate-400 font-mono">{p.sale.customer.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-semibold ${colorCls}`}>
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-100">
                        {currency}{parseFloat(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full border font-semibold ${
                          p.status === 'COMPLETED' || !p.status
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {p.status || 'COMPLETED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs truncate max-w-xs">
                        {p.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <ReportPagination
          page={page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.total}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

