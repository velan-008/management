import React, { useState, useEffect, useCallback } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Check,
  X,
  Clock
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { expenseService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Inventory', 'Marketing', 'Transport',
  'Maintenance', 'Shop Supplies', 'Insurance', 'Taxes', 'Equipment', 'Loading & Packing', 'Other'
];

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTHER'];

function ExpenseForm({ expense, onSave, onClose }) {
  const [form, setForm] = useState({
    description: expense?.description || '',
    amount: expense?.amount || '',
    category: expense?.category || 'Other',
    expense_date: expense?.expense_date || new Date().toISOString().slice(0, 10),
    payment_method: expense?.payment_method || 'CASH',
    notes: expense?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) { setError('Description and amount are required'); return; }
    setLoading(true);
    try {
      if (expense) await expenseService.update(expense.id, form);
      else await expenseService.create(form);
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg border border-rose-200">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="e.g., Shop electricity bill, Loading cartons" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Amount *</label>
          <input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="0.00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
          <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
          <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            placeholder="Optional receipt notes or voucher ref" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" isLoading={loading} className="flex-1">{expense ? 'Save Changes' : 'Record Expense'}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function ExpensesPage() {
  const { business, user, isAdmin } = useAuth();
  const currency = business?.currency_symbol || '$';
  const isManagerOrAdmin = isAdmin || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [notification, setNotification] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15, search };
      if (filterCategory) params.category = filterCategory;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await expenseService.list(params);
      setExpenses(res.data.expenses);
      setMeta(res.meta || { total: 0, totalPages: 1 });
      setTotalAmount(res.data.expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0));
    } catch {}
    finally { setLoading(false); }
  }, [page, search, filterCategory, dateFrom, dateTo]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleSave = (msg = 'Saved') => { setModal(null); setSelected(null); showNotification(msg); fetchExpenses(); };

  const handleDelete = async (expense) => {
    if (!confirm(`Delete this expense?`)) return;
    try {
      await expenseService.delete(expense.id);
      showNotification('Expense deleted');
      fetchExpenses();
    } catch (err) { alert(err.message || 'Failed'); }
  };

  const handleApprove = async (id) => {
    try {
      await expenseService.approve(id);
      showNotification('Expense approved successfully');
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    try {
      await expenseService.reject(id);
      showNotification('Expense rejected');
      fetchExpenses();
    } catch (err) {
      alert(err.message || 'Failed to reject');
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          <CheckCircle className="w-4 h-4" /> {notification}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.total} records</p>
        </div>
        <Button icon={Plus} onClick={() => { setSelected(null); setModal('create'); }}>
          Record Expense
        </Button>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
          <ReceiptText className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <p className="text-xs text-slate-500">Total (Current Filter)</p>
          <p className="text-xl font-bold text-slate-900">{currency}{totalAmount.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Search expenses..." />
        </div>
        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white">
          <option value="">All Categories</option>
          {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : expenses.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center">
                  <ReceiptText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No expenses recorded</p>
                </td></tr>
              ) : (
                expenses.map(e => {
                  const status = e.approval_status || 'APPROVED';
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{e.description}</p>
                        {e.notes && <p className="text-xs text-slate-400 truncate max-w-[200px]">{e.notes}</p>}
                      </td>
                      <td className="px-4 py-3"><Badge variant="neutral">{e.category}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">{e.expense_date}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{e.payment_method?.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {status === 'PENDING' && <Clock className="w-3 h-3 text-amber-500" />}
                          {status === 'APPROVED' && <Check className="w-3 h-3 text-emerald-500" />}
                          {status === 'REJECTED' && <X className="w-3 h-3 text-rose-500" />}
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-slate-900">{currency}{parseFloat(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isManagerOrAdmin && status === 'PENDING' && (
                            <>
                              <button
                                title="Approve expense"
                                onClick={() => handleApprove(e.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Reject expense"
                                onClick={() => handleReject(e.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button onClick={() => { setSelected(e); setModal('edit'); }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">Page {page} of {meta.totalPages}</p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Record Expense">
        <ExpenseForm onSave={() => handleSave('Expense recorded!')} onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={() => setModal(null)} title="Edit Expense">
        {selected && <ExpenseForm expense={selected} onSave={() => handleSave('Expense updated!')} onClose={() => setModal(null)} />}
      </Modal>
    </div>
  );
}
