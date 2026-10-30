import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  Building2,
  Calendar,
  Eye,
  CheckSquare,
  CreditCard,
  XCircle,
  FileText,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { purchaseService, supplierService, productService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatCurrency as formatCur } from '../../utils/formatters.js';

export function PurchasesPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '$';

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [modal, setModal] = useState(null); // 'create', 'view', 'receive', 'pay', 'cancel'
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [notification, setNotification] = useState('');

  // PO Form State
  const [poForm, setPoForm] = useState({
    supplier_id: '',
    purchase_date: new Date().toISOString().slice(0, 10),
    items: [
      { product_id: '', product_name: '', product_sku: '', quantity: 10, unit: 'boxes', unit_cost_price: 100, tax_rate: 5 }
    ],
    freight_charges: 0,
    discount_total: 0,
    paid_amount: 0,
    payment_method: 'BANK_TRANSFER',
    notes: ''
  });
  const [poSubmitting, setPoSubmitting] = useState(false);
  const [poError, setPoError] = useState('');

  // Receive Form State
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        purchaseService.list(),
        supplierService.list(),
        productService.list({ limit: 100 })
      ]);
      setPurchases(purchasesRes.data?.purchases || []);
      setSuppliers(suppliersRes.data?.suppliers || []);
      setProducts(productsRes.data?.products || []);
    } catch (err) {
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // PO Items handling
  const handleAddItem = () => {
    setPoForm((f) => ({
      ...f,
      items: [
        ...f.items,
        { product_id: '', product_name: '', product_sku: '', quantity: 10, unit: 'boxes', unit_cost_price: 0, tax_rate: 5 }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    setPoForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemProductSelect = (index, prodId) => {
    const prod = products.find((p) => String(p.id) === String(prodId));
    setPoForm((f) => {
      const newItems = [...f.items];
      if (prod) {
        newItems[index] = {
          ...newItems[index],
          product_id: prod.id,
          product_name: prod.name,
          product_sku: prod.sku,
          unit: prod.unit || 'boxes',
          unit_cost_price: parseFloat(prod.cost_price) || 0,
          tax_rate: parseFloat(prod.tax_rate) || 5
        };
      } else {
        newItems[index].product_id = '';
      }
      return { ...f, items: newItems };
    });
  };

  const handleItemChange = (index, field, value) => {
    setPoForm((f) => {
      const newItems = [...f.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...f, items: newItems };
    });
  };

  // Compute PO Form live totals
  const subtotal = poForm.items.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.unit_cost_price) || 0;
    return sum + q * p;
  }, 0);

  const taxTotal = poForm.items.reduce((sum, item) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.unit_cost_price) || 0;
    const r = parseFloat(item.tax_rate) || 0;
    return sum + (q * p * r) / 100;
  }, 0);

  const freight = parseFloat(poForm.freight_charges) || 0;
  const discount = parseFloat(poForm.discount_total) || 0;
  const grandTotal = Math.max(0, subtotal + taxTotal + freight - discount);

  const handleCreatePo = async (e) => {
    e.preventDefault();
    setPoError('');
    if (!poForm.supplier_id) {
      setPoError('Please select a supplier');
      return;
    }
    if (poForm.items.length === 0) {
      setPoError('Please add at least one line item');
      return;
    }

    setPoSubmitting(true);
    try {
      await purchaseService.create(poForm);
      showNotification('Purchase order created successfully');
      setModal(null);
      fetchData();
    } catch (err) {
      setPoError(err.message || 'Failed to create purchase order');
    } finally {
      setPoSubmitting(false);
    }
  };

  const handleOpenReceive = (purchase) => {
    setSelectedPurchase(purchase);
    // Initialize receive items with remaining pending quantities
    const itemsToReceive = (purchase.items || []).map((it) => ({
      id: it.id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity_ordered: it.quantity_ordered,
      already_received: it.quantity_received || 0,
      quantity_received: Math.max(0, it.quantity_ordered - (it.quantity_received || 0)),
      unit: it.unit
    }));
    setReceiveItems(itemsToReceive);
    setModal('receive');
  };

  const handleConfirmReceive = async () => {
    if (!selectedPurchase) return;
    setReceiveSubmitting(true);
    try {
      await purchaseService.receiveGoods(selectedPurchase.id, { items: receiveItems });
      showNotification('Goods received and stock successfully updated!');
      setModal(null);
      setSelectedPurchase(null);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to confirm goods receipt');
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    setPaySubmitting(true);
    try {
      await purchaseService.recordPayment(selectedPurchase.id, payForm);
      showNotification('Supplier payment recorded successfully');
      setModal(null);
      setSelectedPurchase(null);
      fetchData();
    } catch (err) {
      showNotification(err.message || 'Failed to record payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const inv = (p.invoice_number || '').toLowerCase();
    const sup = (p.supplier?.name || p.supplier?.company_name || '').toLowerCase();
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || inv.includes(q) || sup.includes(q);

    if (!matchesSearch) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    return true;
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
            Purchases & Supplier Shipments
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage purchase orders, verify received goods into inventory, and track supplier payables.
          </p>
        </div>
        <Button
          icon={Plus}
          onClick={() => {
            setPoForm({
              supplier_id: suppliers[0]?.id || '',
              purchase_date: new Date().toISOString().slice(0, 10),
              items: [
                { product_id: '', product_name: '', product_sku: '', quantity: 10, unit: 'boxes', unit_cost_price: 50, tax_rate: 5 }
              ],
              freight_charges: 0,
              discount_total: 0,
              paid_amount: 0,
              payment_method: 'BANK_TRANSFER',
              notes: ''
            });
            setPoError('');
            setModal('create');
          }}
        >
          Create Purchase Order
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO #, supplier name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All Orders', value: 'ALL' },
            { label: 'Ordered', value: 'ORDERED' },
            { label: 'Received', value: 'RECEIVED' },
            { label: 'Partially Received', value: 'PARTIALLY_RECEIVED' },
            { label: 'Cancelled', value: 'CANCELLED' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Purchases Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center animate-pulse">
          <p className="text-xs text-slate-400">Loading purchase orders...</p>
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold text-sm">No purchase orders found</p>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Create your first purchase order to stock wholesale packaged snacks, chocolates, and beverages.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">PO / Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Receipt Status</th>
                  <th className="py-3 px-4 text-center">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((po) => {
                  const isReceived = po.status === 'RECEIVED';
                  const isPartial = po.status === 'PARTIALLY_RECEIVED';
                  const isCancelled = po.status === 'CANCELLED';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{po.invoice_number}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {po.supplier?.name || 'Wholesale Supplier'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{po.purchase_date}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {currency}{parseFloat(po.grand_total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-600">
                        {currency}{parseFloat(po.balance_due || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            isReceived ? 'success' : isPartial ? 'warning' : isCancelled ? 'danger' : 'neutral'
                          }
                        >
                          {po.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={po.payment_status === 'PAID' ? 'success' : po.payment_status === 'PARTIALLY_PAID' ? 'warning' : 'danger'}>
                          {po.payment_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            icon={Eye}
                            className="px-2 py-1 text-[11px]"
                            title="View PO Details"
                            onClick={() => {
                              setSelectedPurchase(po);
                              setModal('view');
                            }}
                          >
                            View
                          </Button>

                          {!isReceived && !isCancelled && (
                            <Button
                              size="sm"
                              icon={CheckSquare}
                              className="px-2 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                              title="Receive Goods"
                              onClick={() => handleOpenReceive(po)}
                            >
                              Receive
                            </Button>
                          )}

                          {parseFloat(po.balance_due || 0) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              icon={CreditCard}
                              className="px-2 py-1 text-[11px] text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              title="Record Payment"
                              onClick={() => {
                                setSelectedPurchase(po);
                                setPayForm({
                                  amount: po.balance_due,
                                  payment_method: 'BANK_TRANSFER',
                                  reference_number: `SPAY-${Date.now().toString().slice(-6)}`,
                                  payment_date: new Date().toISOString().slice(0, 10),
                                  notes: `Payment for ${po.invoice_number}`
                                });
                                setModal('pay');
                              }}
                            >
                              Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={modal === 'create'}
        onClose={() => setModal(null)}
        title="Create Wholesale Purchase Order"
        size="lg"
      >
        <form onSubmit={handleCreatePo} className="space-y-4 text-xs">
          {poError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {poError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                value={poForm.supplier_id}
                onChange={(e) => setPoForm((f) => ({ ...f, supplier_id: e.target.value }))}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900 bg-white"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.company_name || s.phone || 'Supplier'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={poForm.purchase_date}
                onChange={(e) => setPoForm((f) => ({ ...f, purchase_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
            <div className="bg-slate-50 px-3.5 py-2 font-semibold text-slate-800 flex items-center justify-between border-b border-slate-200">
              <span>Order Line Items</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
              {poForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50/60 p-2 rounded-lg border border-slate-200/60">
                  <div className="col-span-4">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Product</label>
                    <select
                      value={item.product_id}
                      onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="">-- Select or Type Below --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.unit})
                        </option>
                      ))}
                    </select>
                    {!item.product_id && (
                      <input
                        type="text"
                        placeholder="Or custom item name"
                        value={item.product_name}
                        onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                        className="w-full mt-1 border border-slate-200 rounded px-2 py-0.5 text-xs"
                      />
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="boxes">Boxes</option>
                      <option value="cartons">Cartons</option>
                      <option value="packets">Packets</option>
                      <option value="pcs">Pieces</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Cost Price ({currency})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_cost_price}
                      onChange={(e) => handleItemChange(idx, 'unit_cost_price', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[10px] text-slate-500 mb-0.5">Tax %</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={item.tax_rate}
                      onChange={(e) => handleItemChange(idx, 'tax_rate', e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                    />
                  </div>

                  <div className="col-span-1 text-right pt-3">
                    {poForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charges & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Freight / Transport Charges</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={poForm.freight_charges}
                onChange={(e) => setPoForm((f) => ({ ...f, freight_charges: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Discount Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={poForm.discount_total}
                onChange={(e) => setPoForm((f) => ({ ...f, discount_total: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Advance Amount Paid</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={poForm.paid_amount}
                onChange={(e) => setPoForm((f) => ({ ...f, paid_amount: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={poForm.payment_method}
                onChange={(e) => setPoForm((f) => ({ ...f, payment_method: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
              >
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          {/* Order Summary Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{currency}{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Tax (GST):</span>
              <span>{currency}{taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Freight:</span>
              <span>{currency}{freight.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount:</span>
                <span>-{currency}{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Grand Total:</span>
              <span>{currency}{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={poSubmitting}>
              Create Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Goods Receipt Modal */}
      <Modal
        isOpen={modal === 'receive'}
        onClose={() => setModal(null)}
        title={`Confirm Goods Receipt — ${selectedPurchase?.invoice_number}`}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            Verify the physical quantities received into the warehouse. Only confirmed quantities will increase product stock.
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {receiveItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.product_name}</p>
                  <p className="text-[11px] text-slate-500">
                    Ordered: {item.quantity_ordered} {item.unit} | Previously Received: {item.already_received}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Receive:</span>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity_ordered - item.already_received}
                    value={item.quantity_received}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setReceiveItems((arr) => {
                        const copy = [...arr];
                        copy[idx].quantity_received = val;
                        return copy;
                      });
                    }}
                    className="w-20 border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-900"
                  />
                  <span className="text-slate-500">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={receiveSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleConfirmReceive}
            >
              Confirm Receipt & Update Stock
            </Button>
          </div>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={modal === 'pay'}
        onClose={() => setModal(null)}
        title={`Record Supplier Payment — ${selectedPurchase?.invoice_number}`}
        size="sm"
      >
        <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
            <p>
              Supplier: <strong className="text-slate-900">{selectedPurchase?.supplier?.name}</strong>
            </p>
            <p>
              Balance Due: <strong className="text-rose-600">{currency}{parseFloat(selectedPurchase?.balance_due || 0).toFixed(2)}</strong>
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
              placeholder="e.g. TXN-998811"
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

      {/* View PO Details Modal */}
      <Modal
        isOpen={modal === 'view'}
        onClose={() => setModal(null)}
        title={`Purchase Order — ${selectedPurchase?.invoice_number}`}
        size="lg"
      >
        {selectedPurchase && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400">Supplier:</span>
                <p className="font-bold text-slate-900">{selectedPurchase.supplier?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Date:</span>
                <p className="font-semibold text-slate-800">{selectedPurchase.purchase_date}</p>
              </div>
              <div>
                <span className="text-slate-400">Receipt Status:</span>
                <p className="font-semibold text-slate-800">{selectedPurchase.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Payment Status:</span>
                <p className="font-semibold text-slate-800">{selectedPurchase.payment_status}</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Received</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedPurchase.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-slate-900">{it.product_name}</td>
                      <td className="py-2 px-3 text-center">{it.quantity_ordered} {it.unit}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600">{it.quantity_received} {it.unit}</td>
                      <td className="py-2 px-3 text-right">{currency}{parseFloat(it.unit_cost_price).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold">{currency}{parseFloat(it.line_total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Grand Total:</span>
                  <span className="font-bold text-slate-900">{currency}{parseFloat(selectedPurchase.grand_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Paid Amount:</span>
                  <span>{currency}{parseFloat(selectedPurchase.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span>{currency}{parseFloat(selectedPurchase.balance_due || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
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

