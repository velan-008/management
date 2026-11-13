import React, { useState, useEffect, useCallback } from 'react';
import { saleService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function SalesReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search,
        date_from: dateFrom,
        date_to: dateTo
      };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const res = await saleService.list(params);
      const rows = res.data?.sales || [];
      setSales(rows);
      setPagination({
        total: res.meta?.total || rows.length,
        totalPages: res.meta?.totalPages || 1
      });
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Calculations across current results
  const totalSalesVal = sales.reduce((sum, s) => sum + (parseFloat(s.grand_total) || 0) - (parseFloat(s.refunded_amount) || 0), 0);
  const totalDiscounts = sales.reduce((sum, s) => sum + (parseFloat(s.discount_total) || 0), 0);
  const totalTax = sales.reduce((sum, s) => sum + (parseFloat(s.tax_total) || 0), 0);
  const avgOrderVal = sales.length > 0 ? (totalSalesVal / sales.length) : 0;

  const handleExportExcel = () => {
    const headers = ['Invoice #', 'Date', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Paid', 'Balance Due', 'Payment Status', 'Status'];
    const rows = sales.map((s) => [
      s.invoice_number,
      s.invoice_date,
      s.customer ? s.customer.name : 'Walk-in Customer',
      s.subtotal,
      s.discount_total,
      s.tax_total,
      s.grand_total,
      s.paid_amount,
      s.balance_due,
      s.payment_status,
      s.status
    ]);
    exportTableToCsv(`Sales-Report-${dateFrom}-to-${dateTo}`, headers, rows);
  };

  const handlePrint = () => {
    printReport(`Sales Report (${dateFrom} to ${dateTo})`, 'sales-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Sales Value" value={`${currency}${totalSalesVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext={`${sales.length} transactions in view`} />
        <ReportStatPill label="Avg Order Value" value={`${currency}${avgOrderVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Per completed sale" />
        <ReportStatPill label="Total Tax Collected" value={`${currency}${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="GST Included" />
        <ReportStatPill label="Discounts Granted" value={`${currency}${totalDiscounts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Item & order discounts" />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by invoice number..."
        onRefresh={fetchSales}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E99FC1] focus:border-[#E99FC1] bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
            <option value="REFUNDED">Refunded</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        }
      />

      {/* Table Container */}
      <div id="sales-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sales Transactions Register</h3>
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
                <th className="px-3 py-3 text-right">Discount</th>
                <th className="px-3 py-3 text-right">Tax</th>
                <th className="px-3 py-3 text-right font-bold">Grand Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Balance Due</th>
                <th className="px-3 py-3 text-center">Payment Status</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="11" className="text-center py-10 text-slate-400">Loading sales transactions...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-10 text-slate-400">No sales transactions found for this period</td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{s.invoice_number}</td>
                    <td className="px-3 py-2.5 text-slate-600">{s.invoice_date}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{s.customer ? s.customer.name : 'Walk-in Customer'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(s.subtotal || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-600">-{currency}{parseFloat(s.discount_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(s.tax_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{currency}{parseFloat(s.grand_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600 font-medium">{currency}{parseFloat(s.paid_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-medium">{currency}{parseFloat(s.balance_due || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        s.payment_status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {s.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.status === 'COMPLETED' ? 'bg-slate-100 text-slate-700' :
                        s.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status}
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

