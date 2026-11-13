import React, { useState, useEffect, useCallback } from 'react';
import { reportService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function CustomerReportTab({ currency = '₹' }) {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search
      };
      if (typeFilter !== 'ALL') params.customer_type = typeFilter;
      const res = await reportService.getCustomersReport(params);
      const data = res?.data || res || {};
      setCustomers(data.customers || []);
      setSummary(data.summary || {});
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch customers report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleExportExcel = () => {
    const headers = ['Customer Name', 'Phone', 'Type', 'State', 'Credit Limit', 'Outstanding Balance', 'Total Invoices', 'Total Sales', 'Total Paid', 'Credit Status'];
    const rows = customers.map((c) => [
      c.name,
      c.phone || '-',
      c.customer_type,
      c.state || '-',
      c.credit_limit,
      c.outstanding_balance,
      c.total_invoices,
      c.total_sales_amount,
      c.total_paid,
      c.credit_status
    ]);
    exportTableToCsv(`Customer-Ledger-Report-${Date.now()}`, headers, rows);
  };

  const handlePrint = () => {
    printReport('Customer Receivables & Ledger Report', 'customer-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Customers" value={summary?.totalCustomers || pagination.total} subtext="Registered accounts" />
        <ReportStatPill label="Total Trade Receivables" value={`${currency}${(summary?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Outstanding customer credit" />
        <ReportStatPill label="Over Credit Limit" value={summary?.overLimitCount || 0} subtext="Requires payment recovery" color="bg-rose-50 text-rose-700" />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search customer name or phone..."
        onRefresh={fetchCustomers}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E99FC1] focus:border-[#E99FC1] bg-white text-slate-700"
          >
            <option value="ALL">All Customer Tiers</option>
            <option value="RETAILER">Retailer</option>
            <option value="WHOLESALER">Wholesaler</option>
            <option value="SUB_WHOLESALER">Sub-Wholesaler</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        }
      />

      {/* Table Container */}
      <div id="customer-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Customer Accounts & Receivables Ledger</h3>
            <p className="text-xs text-slate-500">Live credit exposure and sales history</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Customer Name</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3 text-right">Credit Limit</th>
                <th className="px-3 py-3 text-right font-bold">Outstanding Balance</th>
                <th className="px-3 py-3 text-center">Invoices</th>
                <th className="px-3 py-3 text-right">Total Billed</th>
                <th className="px-3 py-3 text-right">Total Paid</th>
                <th className="px-4 py-3 text-center">Credit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">Loading customer ledger...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">No customers found</td>
                </tr>
              ) : (
                customers.map((c) => {
                  const out = parseFloat(c.outstanding_balance) || 0;
                  const limit = parseFloat(c.credit_limit) || 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-900">{c.name}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600">{c.phone || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {c.customer_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{limit.toFixed(2)}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-bold ${out > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                        {currency}{out.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-700">{c.total_invoices}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-700">{currency}{(c.total_sales_amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-600">{currency}{(c.total_paid || 0).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.credit_status === 'OVER_LIMIT' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          c.credit_status === 'NEAR_LIMIT' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {c.credit_status}
                        </span>
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

