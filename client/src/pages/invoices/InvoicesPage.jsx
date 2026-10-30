import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Search, ChevronLeft, ChevronRight, Eye, CreditCard,
  RotateCcw, CheckCircle, Clock, AlertCircle, Printer, X
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { saleService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle },
  PARTIALLY_REFUNDED: { label: 'Part. Refunded', variant: 'warning', icon: AlertCircle },
  REFUNDED: { label: 'Refunded', variant: 'error', icon: RotateCcw },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', icon: X }
};

const PAY_STATUS_CONFIG = {
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partial', variant: 'warning' },
  UNPAID: { label: 'Unpaid', variant: 'error' }
};

function SaleDetailModal({ saleId, onClose, onPayment, onRefund }) {
  const { business, isAdmin } = useAuth();
  const currency = business?.currency_symbol || '$';
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH' });
  const [payLoading, setPayLoading] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);

  // Refund state
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundItems, setRefundItems] = useState({});
  const [refundReason, setRefundReason] = useState('Customer Return');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    saleService.getById(saleId).then((r) => {
      setSale(r.data.sale);
      setLoading(false);
    });
  }, [saleId]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setPayLoading(true);
    try {
      await saleService.addPayment(saleId, payForm);
      onPayment();
      onClose();
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setPayLoading(false);
    }
  };

  const handleRefund = async (e) => {
    e.preventDefault();
    const itemsToRefund = Object.entries(refundItems)
      .map(([saleItemId, qty]) => ({
        sale_item_id: parseInt(saleItemId, 10),
        quantity: parseInt(qty, 10)
      }))
      .filter((i) => i.quantity > 0);

    if (itemsToRefund.length === 0) {
      alert('Please specify at least one item quantity to refund.');
      return;
    }

    setRefundLoading(true);
    try {
      await saleService.refund(saleId, {
        items: itemsToRefund,
        reason: refundReason,
        refund_method: refundMethod
      });
      alert('Refund processed successfully.');
      onRefund();
      onClose();
    } catch (err) {
      alert(err.message || 'Refund failed');
    } finally {
      setRefundLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="py-10 text-center text-slate-400">Loading invoice details...</div>;
  if (!sale) return null;

  const ps = PAY_STATUS_CONFIG[sale.payment_status] || PAY_STATUS_CONFIG.UNPAID;
  const ss = STATUS_CONFIG[sale.status] || STATUS_CONFIG.COMPLETED;

  return (
    <div className="space-y-5 print:p-0">
      {/* Invoice Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs text-slate-400">Invoice Number</p>
          <p className="text-lg font-bold text-slate-900 font-mono">{sale.invoice_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ss.variant}>{ss.label}</Badge>
          <Badge variant={ps.variant}>{ps.label}</Badge>
          <button
            type="button"
            onClick={handlePrint}
            title="Print Invoice"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-2"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Business & Customer Info */}
      <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div>
          <p className="font-semibold text-slate-800">{business?.name || 'BUSINESSFLOW Store'}</p>
          <p className="text-slate-500">{business?.address || 'Tax Invoice'}</p>
          {business?.tax_number && (
            <p className="text-slate-600 font-mono mt-0.5">GSTIN/Tax ID: {business.tax_number}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-slate-400">Billed To:</p>
          <p className="font-semibold text-slate-800">{sale.customer?.name || 'Walk-in Customer'}</p>
          {sale.customer?.phone && <p className="text-slate-500">Phone: {sale.customer.phone}</p>}
          {sale.customer?.tax_number && <p className="text-slate-500 font-mono">Tax ID: {sale.customer.tax_number}</p>}
          <p className="text-slate-400 mt-1">Invoice Date: {sale.invoice_date}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-500">Item</th>
              <th className="px-3 py-2 text-center font-semibold text-slate-500">Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-500">Price</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-500">Tax</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {(sale.items || []).map((item) => {
              const unitPrice = parseFloat(item.unit_selling_price || item.unit_price || 0);
              const maxRefundable = item.quantity - (item.refunded_quantity || 0);

              return (
                <tr key={item.id}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-800">{item.product_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{item.product_sku}</p>
                    {item.refunded_quantity > 0 && (
                      <p className="text-rose-600 text-[10px] font-medium">
                        Refunded: {item.refunded_quantity} pcs
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-slate-600 font-mono">
                    {currency}{unitPrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500 font-mono">
                    {parseFloat(item.tax_rate || 0)}%
                  </td>
                  <td className="px-3 py-2 text-right font-semibold font-mono text-slate-900">
                    {currency}{parseFloat(item.line_total).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals & Tax Breakdown */}
      <div className="space-y-1.5 text-xs bg-white p-3 border border-slate-100 rounded-lg">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <span className="font-mono">{currency}{parseFloat(sale.subtotal).toFixed(2)}</span>
        </div>
        {parseFloat(sale.discount_total) > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discounts</span>
            <span className="font-mono">−{currency}{parseFloat(sale.discount_total).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(sale.cgst_total) > 0 && (
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>CGST</span>
            <span className="font-mono">{currency}{parseFloat(sale.cgst_total).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(sale.sgst_total) > 0 && (
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>SGST</span>
            <span className="font-mono">{currency}{parseFloat(sale.sgst_total).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(sale.igst_total) > 0 && (
          <div className="flex justify-between text-slate-500 text-[11px]">
            <span>IGST</span>
            <span className="font-mono">{currency}{parseFloat(sale.igst_total).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-slate-900 text-sm border-t border-slate-100 pt-2">
          <span>Grand Total</span>
          <span className="font-mono">{currency}{parseFloat(sale.grand_total).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-emerald-600">
          <span>Paid</span>
          <span className="font-mono">{currency}{parseFloat(sale.paid_amount).toFixed(2)}</span>
        </div>
        {parseFloat(sale.balance_due) > 0 && (
          <div className="flex justify-between text-amber-600 font-medium">
            <span>Balance Due</span>
            <span className="font-mono">{currency}{parseFloat(sale.balance_due).toFixed(2)}</span>
          </div>
        )}
        {parseFloat(sale.refunded_amount) > 0 && (
          <div className="flex justify-between text-rose-500">
            <span>Refunded</span>
            <span className="font-mono">−{currency}{parseFloat(sale.refunded_amount).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Payments Log */}
      {sale.payments?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Payment History</p>
          <div className="space-y-1">
            {sale.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded">
                <span>{p.payment_method} · {new Date(p.payment_date || p.created_at).toLocaleDateString()}</span>
                <span className="font-mono font-medium">{currency}{parseFloat(p.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Action */}
      {sale.payment_status !== 'PAID' && (
        <div>
          {!showPayForm ? (
            <Button variant="outline" icon={CreditCard} size="sm" onClick={() => setShowPayForm(true)}>
              Record Balance Payment
            </Button>
          ) : (
            <form onSubmit={handlePayment} className="border border-slate-100 rounded-lg p-3 space-y-3 bg-slate-50">
              <p className="text-xs font-semibold text-slate-700">Record Payment</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={sale.balance_due}
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-slate-900"
                  placeholder={`Amount (max ${sale.balance_due})`}
                />
                <select
                  value={payForm.method}
                  onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                >
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={payLoading} className="flex-1">
                  Submit Payment
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowPayForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Return / Refund Action (Admins & Managers) */}
      {isAdmin && sale.status !== 'REFUNDED' && sale.status !== 'CANCELLED' && (
        <div className="pt-2 border-t border-slate-100">
          {!showRefundForm ? (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={() => setShowRefundForm(true)}
            >
              Process Return / Refund
            </Button>
          ) : (
            <form onSubmit={handleRefund} className="border border-rose-100 rounded-lg p-3 space-y-3 bg-rose-50/40">
              <p className="text-xs font-semibold text-rose-900">Process Return / Refund</p>
              <div className="space-y-2">
                {(sale.items || []).map((item) => {
                  const maxRefundable = item.quantity - (item.refunded_quantity || 0);
                  if (maxRefundable <= 0) return null;

                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-rose-100">
                      <div>
                        <p className="font-medium text-slate-800">{item.product_name}</p>
                        <p className="text-[10px] text-slate-400">Max returnable: {maxRefundable}</p>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={maxRefundable}
                        value={refundItems[item.id] || ''}
                        onChange={(e) =>
                          setRefundItems((prev) => ({
                            ...prev,
                            [item.id]: e.target.value
                          }))
                        }
                        placeholder="0"
                        className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-center"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Reason for return"
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                />
                <select
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
                >
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD</option>
                  <option value="UPI">UPI</option>
                  <option value="STORE_CREDIT">STORE CREDIT</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="danger" isLoading={refundLoading} className="flex-1">
                  Confirm Refund
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowRefundForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function InvoicesPage() {
  const { business } = useAuth();
  const currency = business?.currency_symbol || '$';
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayStatus, setFilterPayStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (filterStatus) params.status = filterStatus;
      if (filterPayStatus) params.payment_status = filterPayStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await saleService.list(params);
      setSales(res.data?.sales || []);
      setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPayStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales & Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.total} invoices total</p>
        </div>
        <a
          href="/api/reports/export/sales"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Search invoice number..."
          />
        </div>
        <select
          value={filterPayStatus}
          onChange={(e) => {
            setFilterPayStatus(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white cursor-pointer"
        >
          <option value="">All Payment Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="UNPAID">Unpaid</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500">No invoices found</p>
                  </td>
                </tr>
              ) : (
                sales.map((s) => {
                  const ps = PAY_STATUS_CONFIG[s.payment_status];
                  const ss = STATUS_CONFIG[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">{s.invoice_number}</td>
                      <td className="px-4 py-3 text-slate-600">{s.invoice_date}</td>
                      <td className="px-4 py-3 text-slate-700">{s.customer?.name || <span className="text-slate-400 italic">Walk-in</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-slate-900">{currency}{parseFloat(s.grand_total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{currency}{parseFloat(s.paid_amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">
                        {parseFloat(s.balance_due) > 0 ? `${currency}${parseFloat(s.balance_due).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center"><Badge variant={ps?.variant}>{ps?.label}</Badge></td>
                      <td className="px-4 py-3 text-center"><Badge variant={ss?.variant}>{ss?.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleId(s.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={!!selectedSaleId} onClose={() => setSelectedSaleId(null)} title="Invoice Details" size="lg">
        {selectedSaleId && (
          <SaleDetailModal
            saleId={selectedSaleId}
            onClose={() => setSelectedSaleId(null)}
            onPayment={fetchSales}
            onRefund={fetchSales}
          />
        )}
      </Modal>
    </div>
  );
}
