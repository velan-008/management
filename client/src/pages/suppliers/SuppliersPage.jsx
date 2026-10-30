import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Edit2,
  Trash2,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { supplierService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';

export function SuppliersPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '$';

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [modal, setModal] = useState(null); // 'create', 'edit', 'view', 'pay', 'deactivate'
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [notification, setNotification] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    state: '',
    payment_terms: 'Net 30',
    opening_balance: 0
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment Form State
  const [payForm, setPayForm] = useState({
    amount: '',
    payment_method: 'BANK_TRANSFER',
    reference_number: '',
    payment_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });
  const [paySubmitting, setPaySubmitting] = useState(false);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supplierService.list();
      setSuppliers(res.data?.suppliers || []);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenCreate = () => {
    setForm({
      name: '',
      company_name: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      state: '',
      payment_terms: 'Net 30',
      opening_balance: 0
    });
    setFormError('');
    setSelectedSupplier(null);
    setModal('create');
  };

  const handleOpenEdit = (sup) => {
    setSelectedSupplier(sup);
    setForm({
      name: sup.name,
      company_name: sup.company_name || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      gst_number: sup.gst_number || '',
      state: sup.state || '',
      payment_terms: sup.payment_terms || 'Net 30'
    });
    setFormError('');
    setModal('edit');
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('Supplier name is required');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      if (selectedSupplier) {
        await supplierService.update(selectedSupplier.id, form);
        showNotification('Supplier details updated successfully');
      } else {
        await supplierService.create(form);
        showNotification('Wholesale supplier added successfully');
      }
      setModal(null);
      fetchSuppliers();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setPaySubmitting(true);
    try {
      await supplierService.recordPayment(selectedSupplier.id, payForm);
      showNotification(`Payment recorded for ${selectedSupplier.name}`);
      setModal(null);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err) {
      showNotification(err.message || 'Payment recording failed');
    } finally {
      setPaySubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = (s.name || '').toLowerCase();
    const comp = (s.company_name || '').toLowerCase();
    const phone = (s.phone || '').toLowerCase();
    const gst = (s.gst_number || '').toLowerCase();
    return name.includes(q) || comp.includes(q) || phone.includes(q) || gst.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Wholesale Suppliers & Vendors
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage distributor profiles, GST details, payment terms, and outstanding payables.
          </p>
        </div>
        <Button icon={Plus} onClick={handleOpenCreate}>
          Add Supplier
        </Button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name, company, phone, GSTIN..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold text-sm">No suppliers found</p>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Add FMCG distributors, confectioners, or beverage depots to manage purchasing and payments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => {
            const balance = parseFloat(sup.outstanding_balance || 0);

            return (
              <div
                key={sup.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-subtle hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {sup.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{sup.name}</p>
                        <p className="text-xs text-slate-500 truncate">{sup.company_name || 'Distributor'}</p>
                      </div>
                    </div>
                    <Badge variant={balance > 0 ? 'warning' : 'success'}>
                      {balance > 0 ? 'Payable Due' : 'Settled'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    {sup.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sup.phone}</span>
                      </div>
                    )}
                    {sup.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{sup.email}</span>
                      </div>
                    )}
                    {sup.gst_number && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>GSTIN: {sup.gst_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Terms: {sup.payment_terms || 'Net 30'}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 font-medium">
                      <span className="text-slate-500">Outstanding Balance:</span>
                      <span className={`text-sm font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {currency}{balance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Edit2}
                    className="flex-1 text-xs"
                    onClick={() => handleOpenEdit(sup)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={CreditCard}
                    className="flex-1 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => {
                      setSelectedSupplier(sup);
                      setPayForm({
                        amount: sup.outstanding_balance > 0 ? sup.outstanding_balance : '',
                        payment_method: 'BANK_TRANSFER',
                        reference_number: `SPAY-${Date.now().toString().slice(-6)}`,
                        payment_date: new Date().toISOString().slice(0, 10),
                        notes: `Settlement for ${sup.name}`
                      });
                      setModal('pay');
                    }}
                  >
                    Pay Supplier
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={selectedSupplier ? 'Edit Supplier Details' : 'Add Wholesale Supplier'}
        size="md"
      >
        <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Supplier / Contact Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Britannia FMCG Depot"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Firm Name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              placeholder="e.g. Britannia Industries Logistics Ltd"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+1 555-0199"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="orders@supplier.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={form.gst_number}
                onChange={(e) => setForm((f) => ({ ...f, gst_number: e.target.value }))}
                placeholder="e.g. 27AABCB1234D1Z5"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <input
                type="text"
                value={form.payment_terms}
                onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                placeholder="e.g. Net 15 Days / Net 30"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Warehouse / Depot Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Depot street, city, state"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {!selectedSupplier && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Outstanding Balance ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.opening_balance}
                onChange={(e) => setForm((f) => ({ ...f, opening_balance: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={formSubmitting}>
              {selectedSupplier ? 'Save Changes' : 'Create Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={modal === 'pay'}
        onClose={() => setModal(null)}
        title={`Record Payment to ${selectedSupplier?.name}`}
        size="sm"
      >
        <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            <p>
              Current Outstanding: <strong className="text-rose-600">{currency}{parseFloat(selectedSupplier?.outstanding_balance || 0).toFixed(2)}</strong>
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Amount ({currency})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={payForm.amount}
              onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
            <select
              value={payForm.payment_method}
              onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
            >
              <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="CASH">Cash</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reference / UTR Number</label>
            <input
              type="text"
              value={payForm.reference_number}
              onChange={(e) => setPayForm((f) => ({ ...f, reference_number: e.target.value }))}
              placeholder="e.g. TXN-102938"
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={paySubmitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

