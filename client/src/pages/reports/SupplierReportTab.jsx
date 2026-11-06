import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function SupplierReportTab({ currency = '₹' }) {
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getSuppliersReport({ page, limit: 15, search });
      const data = res?.data || res || {};
      setSuppliers(data.suppliers || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch suppliers report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleExportExcel = () => {
    const headers = ['Supplier Name', 'Contact Person', 'Phone', 'Email', 'GSTIN', 'Total POs', 'Total Purchases Amount', 'Total Paid', 'Outstanding Balance'];
    const rows = suppliers.map((s) => [
      s.name,
      s.contact_person || '-',
      s.phone || '-',
      s.email || '-',
      s.gstin,
      s.total_purchases_count,
      s.total_purchases_amount,
      s.total_paid,
      s.outstanding_balance
    ]);
    exportTableToCsv(`Supplier-Payables-Report-${Date.now()}`, headers, rows);
  };

  const handlePrint = () => {
    printReport('Supplier Accounts & Payables Ledger', 'supplier-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Active Suppliers" value={summary?.totalSuppliers || pagination.total} subtext="Vendor network" />
        <ReportStatPill label="Total Trade Payables" value={`${currency}${(summary?.totalPayables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Outstanding bills to suppliers" color="bg-amber-50 text-amber-800" />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search supplier name, contact, phone or GSTIN..."
        onRefresh={fetchSuppliers}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
      />

      {/* Table Container */}
      <div id="supplier-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Supplier Payables Ledger</h3>
            <p className="text-xs text-slate-500">Vendor purchase volumes and outstanding liabilities</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-3 py-3">Contact Person</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3 font-mono">GSTIN</th>
                <th className="px-3 py-3 text-center">Purchase Orders</th>
                <th className="px-3 py-3 text-right">Total Purchases</th>
                <th className="px-3 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-right font-bold">Outstanding Payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">Loading suppliers...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">No suppliers found</td>
                </tr>
              ) : (
                suppliers.map((s) => {
                  const out = parseFloat(s.outstanding_balance) || 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{s.name}</td>
                      <td className="px-3 py-2.5 text-slate-700">{s.contact_person || '-'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{s.phone || '-'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{s.gstin}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-700">{s.total_purchases_count}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700">{currency}{(s.total_purchases_amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{currency}{(s.total_paid || 0).toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${out > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {currency}{out.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
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

