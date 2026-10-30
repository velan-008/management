import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, ChevronLeft, ChevronRight, CheckCircle, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { customerService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';

function CustomerForm({ customer, onSave, onClose }) {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    credit_limit: customer?.credit_limit || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { setError('Name is required'); return; }
    setLoading(true);
    try {
      if (customer) await customerService.update(customer.id, form);
      else await customerService.create(form);
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg border border-rose-200">{error}</div>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Customer name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="+91 9999999999" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="email@example.com" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
          <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
            placeholder="Full address" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Credit Limit</label>
          <input type="number" min="0" step="0.01" value={form.credit_limit} onChange={e => setForm(f => ({ ...f, credit_limit: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" isLoading={loading} className="flex-1">{customer ? 'Save Changes' : 'Add Customer'}</Button>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function CustomersPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '₹';
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [notification, setNotification] = useState('');

  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  const fetchCustomerSales = async (customerId) => {
    setLoadingHistory(true);
    try {
      const res = await customerService.salesHistory(customerId);
      setCustomerSales(res.data?.sales || []);
    } catch {
      setCustomerSales([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenView = (customer) => {
    setSelected(customer);
    setModal('view');
    fetchCustomerSales(customer.id);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.list({ page, limit: 15, search });
      setCustomers(res.data.customers);
      setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch {}
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSave = (msg = 'Saved') => { setModal(null); setSelected(null); showNotification(msg); fetchCustomers(); };

  const handleDelete = async (customer) => {
    if (!confirm(`Delete customer "${customer.name}"? This cannot be undone.`)) return;
    try {
      await customerService.delete(customer.id);
      showNotification('Customer deleted');
      fetchCustomers();
    } catch (err) { alert(err.message || 'Delete failed'); }
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
          <h1 className="text-xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.total} customers total</p>
        </div>
        <Button icon={Plus} onClick={() => { setSelected(null); setModal('create'); }}>Add Customer</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          placeholder="Search by name, phone, or email..." />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Limit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">No customers yet</p>
                </td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-xs"><Mail className="w-3 h-3" />{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {parseFloat(c.outstanding_balance) > 0 ? (
                        <span className="text-amber-600 font-medium font-mono">{currency}{parseFloat(c.outstanding_balance).toFixed(2)}</span>
                      ) : (
                        <span className="text-emerald-600 text-xs">Settled</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{currency}{parseFloat(c.credit_limit || 0).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenView(c)}
                          title="View statement & purchases"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelected(c); setModal('edit'); }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      <Modal isOpen={modal === 'create'} onClose={() => setModal(null)} title="Add Customer" size="sm">
        <CustomerForm onSave={() => handleSave('Customer added!')} onClose={() => setModal(null)} />
      </Modal>
      <Modal isOpen={modal === 'edit'} onClose={() => setModal(null)} title="Edit Customer" size="sm">
        {selected && <CustomerForm customer={selected} onSave={() => handleSave('Customer updated!')} onClose={() => setModal(null)} />}
      </Modal>

      {/* VIEW CUSTOMER STATEMENT / PURCHASE HISTORY */}
      <Modal
        isOpen={modal === 'view'}
        onClose={() => setModal(null)}
        title={`Customer Account: ${selected?.name || ''}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400">Phone</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selected.phone || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Email</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selected.email || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Credit Limit</span>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">{currency}{parseFloat(selected.credit_limit || 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-slate-400">Outstanding Balance</span>
                <p className="font-mono font-bold text-amber-600 mt-0.5">{currency}{parseFloat(selected.outstanding_balance || 0).toFixed(2)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Recent Invoices & Transactions
              </h4>
              {loadingHistory ? (
                <div className="space-y-2 py-4">
                  <div className="h-6 bg-slate-100 rounded animate-pulse" />
                  <div className="h-6 bg-slate-100 rounded animate-pulse" />
                </div>
              ) : customerSales.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center bg-white border border-slate-100 rounded-lg">
                  No invoices found for this customer.
                </p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Total</th>
                        <th className="py-2 px-3 text-right">Paid</th>
                        <th className="py-2 px-3 text-right">Balance Due</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerSales.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-indigo-600">{s.invoice_number}</td>
                          <td className="py-2 px-3 text-slate-500">{s.invoice_date}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">{currency}{parseFloat(s.grand_total).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-600">{currency}{parseFloat(s.paid_amount).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono text-amber-600 font-semibold">{currency}{parseFloat(s.balance_due).toFixed(2)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.payment_status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {s.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setModal(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
