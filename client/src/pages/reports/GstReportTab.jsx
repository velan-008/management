import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function GstReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchGstReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search,
        date_from: dateFrom,
        date_to: dateTo
      };
      const res = await reportService.getGstReport(params);
      const data = res?.data || res || {};
      setRecords(data.records || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch GST report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchGstReport();
  }, [fetchGstReport]);

  const handleExportExcel = () => {
    const headers = [
      'Invoice #',
      'Date',
      'Customer Name',
      'Customer GSTIN',
      'Place of Supply',
      'Supply Type',
      'Taxable Value',
      'CGST',
      'SGST',
      'IGST',
      'Total Tax',
      'Grand Total'
    ];
    const rows = records.map((r) => [
      r.invoice_number,
      r.invoice_date,
      r.customer_name,
      r.customer_gstin,
      r.place_of_supply,
      r.transaction_type,
      parseFloat(r.taxable_amount || 0).toFixed(2),
      parseFloat(r.cgst_amount || 0).toFixed(2),
      parseFloat(r.sgst_amount || 0).toFixed(2),
      parseFloat(r.igst_amount || 0).toFixed(2),
      parseFloat(r.tax_amount || 0).toFixed(2),
      parseFloat(r.grand_total || 0).toFixed(2)
    ]);
    exportTableToCsv(`GST-GSTR1-Report-${Date.now()}`, headers, rows);
  };

  const handlePrint = () => {
    printReport('GST Outward Supplies (GSTR-1 Format) Report', 'gst-report-printable');
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportStatPill
          title="Taxable Turnover"
          value={`${currency}${(summary?.totalTaxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Net sales before tax"
          icon="dollar-sign"
        />
        <ReportStatPill
          title="CGST Total"
          value={`${currency}${(summary?.totalCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Central GST collected"
          icon="activity"
        />
        <ReportStatPill
          title="SGST Total"
          value={`${currency}${(summary?.totalSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="State GST collected"
          icon="activity"
        />
        <ReportStatPill
          title="Total Tax Collected"
          value={`${currency}${(summary?.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Total outward GST liability"
          icon="trending-up"
        />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        title="GST Outward Supplies (GSTR-1)"
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search invoice #..."
        onRefresh={fetchGstReport}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        loading={loading}
      />

      {/* Printable / Viewable Table */}
      <div id="gst-report-printable" className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider bg-slate-900/50">
                <th className="py-3.5 px-3 font-semibold">Invoice #</th>
                <th className="py-3.5 px-3 font-semibold">Date</th>
                <th className="py-3.5 px-3 font-semibold">Customer</th>
                <th className="py-3.5 px-3 font-semibold">GSTIN</th>
                <th className="py-3.5 px-3 font-semibold">Type</th>
                <th className="py-3.5 px-3 font-semibold text-right">Taxable</th>
                <th className="py-3.5 px-3 font-semibold text-right">CGST</th>
                <th className="py-3.5 px-3 font-semibold text-right">SGST</th>
                <th className="py-3.5 px-3 font-semibold text-right">IGST</th>
                <th className="py-3.5 px-3 font-semibold text-right">Tax Amt</th>
                <th className="py-3.5 px-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#D4AF37] border-t-transparent mb-2"></div>
                    <div>Loading statutory GST report...</div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    No outward taxable supplies found for this period.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-slate-100">
                      {r.invoice_number}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300 text-xs">
                      {r.invoice_date}
                    </td>
                    <td className="py-3.5 px-3 text-slate-200 text-xs max-w-[140px] truncate">
                      {r.customer_name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-300">
                      {r.customer_gstin}
                    </td>
                    <td className="py-3.5 px-3 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                        r.transaction_type.includes('Inter')
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {r.transaction_type.includes('Inter') ? 'IGST' : 'CGST+SGST'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-slate-100">
                      {currency}{parseFloat(r.taxable_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-300 text-xs">
                      {currency}{parseFloat(r.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-300 text-xs">
                      {currency}{parseFloat(r.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right text-slate-300 text-xs">
                      {currency}{parseFloat(r.igst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-amber-400">
                      {currency}{parseFloat(r.tax_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-100">
                      {currency}{parseFloat(r.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
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

