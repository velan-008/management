import React, { useState, useEffect, useCallback } from 'react';
import { reportService, expenseService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

const EXPENSE_CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'Rent', label: 'Rent' },
  { value: 'Utilities', label: 'Utilities' },
  { value: 'Salaries', label: 'Salaries / Payroll' },
  { value: 'Inventory', label: 'Inventory' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Shop Supplies', label: 'Shop Supplies' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Taxes', label: 'Taxes' },
  { value: 'Equipment', label: 'Equipment' },
  { value: 'Loading & Packing', label: 'Loading & Packing' },
  { value: 'Other', label: 'Other / Miscellaneous' }
];

export function ExpenseReportTab({ dateFrom, dateTo, currency = '₹' }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: search.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      };
      if (categoryFilter !== 'ALL') params.category = categoryFilter;

      let res;
      try {
        res = await reportService.getExpenses(params);
      } catch {
        // Fallback to expenseService.list if reportService.getExpenses fails
        res = await expenseService.list(params);
      }

      const data = res?.data || res || {};
      const rows = data.expenses || [];
      setExpenses(rows);

      if (data.summary) {
        setSummary(data.summary);
      } else {
        const total = rows.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const catTotals = {};
        rows.forEach((e) => {
          const c = e.category || 'Other';
          catTotals[c] = (catTotals[c] || 0) + (parseFloat(e.amount) || 0);
        });
        let highestCat = 'None';
        let highestAmt = 0;
        Object.entries(catTotals).forEach(([c, a]) => {
          if (a > highestAmt) {
            highestAmt = a;
            highestCat = c;
          }
        });

        setSummary({
          totalExpenses: total,
          totalCount: res.meta?.total || rows.length,
          avgExpense: rows.length ? total / rows.length : 0,
          highestCategory: highestCat,
          highestCategoryAmount: highestAmt
        });
      }

      setPagination(data.pagination || {
        total: res.meta?.total || rows.length,
        totalPages: res.meta?.totalPages || 1
      });
    } catch (err) {
      console.error('Failed to fetch expense report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleExportExcel = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Payment Method', 'Status'];
    const rows = expenses.map((e) => [
      e.expense_date,
      e.category,
      e.description || '-',
      parseFloat(e.amount || 0).toFixed(2),
      e.payment_method || 'CASH',
      e.approval_status || 'APPROVED'
    ]);
    exportTableToCsv(`Expense-Report-${dateFrom || 'all'}-to-${dateTo || 'all'}`, headers, rows);
  };

  const handlePrint = () => {
    printReport(`Operating Expense Register (${dateFrom || 'All Time'} to ${dateTo || 'Today'})`, 'expense-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill
          label="Total Operational Expenses"
          value={`${currency}${(summary?.totalExpenses ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtext={`${summary?.totalCount ?? expenses.length} expense items`}
        />
        <ReportStatPill
          label="Highest Spending Category"
          value={summary?.highestCategory || 'None'}
          subtext={`${currency}${(summary?.highestCategoryAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
        />
        <ReportStatPill
          label="Avg Expense Entry"
          value={`${currency}${(summary?.avgExpense ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtext="Per entry"
        />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search expense description or category..."
        onRefresh={fetchExpenses}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E99FC1] focus:border-[#E99FC1] bg-white text-slate-700"
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        }
      />

      {/* Table Container */}
      <div id="expense-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Operating Expense Register</h3>
            <p className="text-xs text-slate-500">Period: {dateFrom || 'All Time'} to {dateTo || 'Today'}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-3 py-3">Payment Method</th>
                <th className="px-3 py-3 text-right font-bold">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">Loading expenses...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400">No expenses recorded for this period</td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 text-slate-600 font-mono">{e.expense_date}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{e.description || '-'}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{e.payment_method || 'CASH'}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-rose-600">{currency}{parseFloat(e.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {e.approval_status || 'APPROVED'}
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

