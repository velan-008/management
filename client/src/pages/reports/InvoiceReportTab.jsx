import React, { useState, useEffect, useCallback } from 'react';
import { invoiceService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function InvoiceReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search,
        from_date: dateFrom,
        to_date: dateTo
      };
      if (paymentStatus !== 'ALL') params.payment_status = paymentStatus;
      const res = await invoiceService.list(params);
      const rows = res.data?.rows || res.data?.invoices || [];
      setInvoices(rows);
      setPagination({
        total: res.data?.count || rows.length,
        totalPages: Math.ceil((res.data?.count || rows.length) / 15) || 1
      });
    } catch (err) {
      console.error('Failed to fetch invoice report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, paymentStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalBilled = invoices.reduce((sum, i) => sum + (parseFloat(i.grand_total) || 0), 0);
  const totalPaid = invoices.reduce((sum, i) => sum + (parseFloat(i.paid_amount) || 0), 0);
  const totalBalance = invoices.reduce((sum, i) => sum + (parseFloat(i.balance_due) || 0), 0);

  const handleExportExcel = () => {
    const headers = ['Invoice #', 'Invoice Date', 'Customer Name', 'Phone', 'Subtotal', 'Tax', 'Grand Total', 'Paid Amount', 'Balance Due', 'Payment Status'];
    const rows = invoices.map((inv) => [
      inv.invoice_number,
      inv.invoice_date,
      inv.customer ? inv.customer.name : 'Walk-in Customer',
      inv.customer?.phone || '-',
      inv.subtotal,
      inv.tax_total,
      inv.grand_total,
      inv.paid_amount,
      inv.balance_due,
      inv.payment_status
    ]);
    exportTableToCsv(`Invoice-Register-${dateFrom}-to-${dateTo}`, headers, rows);
  };

  const handlePrint = () => {
    printReport(`Invoice Register (${dateFrom} to ${dateTo})`, 'invoice-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Billed" value={`${currency}${totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext={`${invoices.length} invoices in view`} />
        <ReportStatPill label="Total Collected" value={`${currency}${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Received payments" />
        <ReportStatPill label="Total Receivables" value={`${currency}${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Outstanding dues" />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search invoice # or customer..."
        onRefresh={fetchInvoices}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={paymentStatus}
            onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white text-slate-700"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="UNPAID">Unpaid / Credit</option>
          </select>
        }
      />

      {/* Table Container */}
      <div id="invoice-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Invoice Register</h3>
            <p className="text-xs text-slate-500">Period: {dateFrom} to {dateTo}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3 text-right">Subtotal</th>
                <th className="px-3 py-3 text-right">Tax</th>
                <th className="px-3 py-3 text-right font-bold">Grand Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">No invoices found for this period</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                    <td className="px-3 py-2.5 text-slate-600">{inv.invoice_date}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">
                      {inv.customer ? inv.customer.name : 'Walk-in Customer'}
                      {inv.customer?.phone && <span className="block text-[10px] text-slate-400 font-mono">{inv.customer.phone}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(inv.tax_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{currency}{parseFloat(inv.grand_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600 font-medium">{currency}{parseFloat(inv.paid_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-medium">{currency}{parseFloat(inv.balance_due || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        inv.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {inv.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ReportPagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.total}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}

