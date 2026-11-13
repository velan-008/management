import React, { useState, useEffect, useCallback } from 'react';
import { purchaseService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function PurchaseReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchPurchases = useCallback(async () => {
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
      const res = await purchaseService.list(params);
      const rows = res.data?.purchases || [];
      setPurchases(rows);
      setPagination({
        total: res.meta?.total || rows.length,
        totalPages: res.meta?.totalPages || 1
      });
    } catch (err) {
      console.error('Failed to fetch purchase report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const totalPurchases = purchases.reduce((sum, p) => sum + (parseFloat(p.grand_total) || 0), 0);
  const totalPaid = purchases.reduce((sum, p) => sum + (parseFloat(p.paid_amount) || 0), 0);
  const totalPayables = purchases.reduce((sum, p) => sum + (parseFloat(p.balance_due) || 0), 0);

  const handleExportExcel = () => {
    const headers = ['Purchase #', 'Date', 'Supplier', 'Subtotal', 'Tax', 'Freight', 'Grand Total', 'Paid', 'Balance Due', 'Status'];
    const rows = purchases.map((p) => [
      p.invoice_number || p.id,
      p.purchase_date,
      p.supplier ? p.supplier.name : 'Direct Supplier',
      p.subtotal,
      p.tax_total,
      p.freight_charges || '0.00',
      p.grand_total,
      p.paid_amount,
      p.balance_due,
      p.status
    ]);
    exportTableToCsv(`Purchase-Report-${dateFrom}-to-${dateTo}`, headers, rows);
  };

  const handlePrint = () => {
    printReport(`Purchase Orders Report (${dateFrom} to ${dateTo})`, 'purchase-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Purchases" value={`${currency}${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext={`${purchases.length} purchase orders`} />
        <ReportStatPill label="Paid to Suppliers" value={`${currency}${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Disbursed vendor payments" />
        <ReportStatPill label="Outstanding Payables" value={`${currency}${totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Pending supplier balances" />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search PO # or supplier..."
        onRefresh={fetchPurchases}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E99FC1] focus:border-[#E99FC1] bg-white text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="ORDERED">Ordered</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        }
      />

      {/* Table Container */}
      <div id="purchase-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Purchase Orders & Inward Register</h3>
            <p className="text-xs text-slate-500">Period: {dateFrom} to {dateTo}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">PO / Bill #</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Supplier</th>
                <th className="px-3 py-3 text-right">Subtotal</th>
                <th className="px-3 py-3 text-right">Tax</th>
                <th className="px-3 py-3 text-right">Freight</th>
                <th className="px-3 py-3 text-right font-bold">Grand Total</th>
                <th className="px-3 py-3 text-right">Paid</th>
                <th className="px-3 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">Loading purchase records...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">No purchase records found for this period</td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{p.invoice_number || `PO-${p.id}`}</td>
                    <td className="px-3 py-2.5 text-slate-600">{p.purchase_date}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{p.supplier ? p.supplier.name : 'Direct Supplier'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(p.subtotal || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(p.tax_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{parseFloat(p.freight_charges || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">{currency}{parseFloat(p.grand_total || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-emerald-600 font-medium">{currency}{parseFloat(p.paid_amount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600 font-medium">{currency}{parseFloat(p.balance_due || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.status === 'RECEIVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.status === 'ORDERED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {p.status}
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

