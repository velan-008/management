import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Search, ChevronLeft, ChevronRight, Eye, CreditCard,
  RotateCcw, CheckCircle, Clock, AlertCircle, Printer, X, Wifi, WifiOff
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { saleService, reportService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { InvoiceDocument } from '../../components/invoice/InvoiceDocument.jsx';
import { db } from '../../offline/db.js';
import { syncManager } from '../../offline/syncManager.js';

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
  const currency = (business?.currency_symbol && business.currency_symbol !== '$') ? business.currency_symbol : '₹';
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printLayout, setPrintLayout] = useState('a4'); // 'a4' | 'thermal'
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
    let isMounted = true;
    const loadSale = async () => {
      try {
        // First check if saleId matches a local offline invoice (UUID or local_bill_id)
        const local = await db.offlineInvoices.get(saleId).catch(() => null);
        if (local && isMounted) {
          setSale({
            ...local,
            id: local.local_bill_id || local.id,
            origin: 'OFFLINE',
            sync_status: local.status === 'SYNCED' ? 'SYNCED' : 'PENDING_SYNC',
            is_offline: local.status !== 'SYNCED'
          });
          setLoading(false);
          return;
        }

        const r = await saleService.getById(saleId);
        if (isMounted) {
          setSale(r.data?.sale || null);
          setLoading(false);
        }
      } catch (err) {
        // Fallback: check db.offlineInvoices by server_invoice_id or id if server call fails
        try {
          const localMatch = await db.offlineInvoices
            .filter((inv) => inv.server_invoice_id === saleId || inv.id === saleId || inv.local_bill_id === saleId)
            .first();
          if (localMatch && isMounted) {
            setSale({
              ...localMatch,
              id: localMatch.local_bill_id || localMatch.id,
              origin: 'OFFLINE',
              sync_status: localMatch.status === 'SYNCED' ? 'SYNCED' : 'PENDING_SYNC',
              is_offline: localMatch.status !== 'SYNCED'
            });
          }
        } catch {
          // Ignore
        }
        if (isMounted) setLoading(false);
      }
    };

    loadSale();
    return () => {
      isMounted = false;
    };
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
    const invoiceEl = document.getElementById('sales-invoice-print-area');
    if (!invoiceEl) return;

    // 1. Clean up any previous direct print container
    let directContainer = document.getElementById('invoice-print-direct-container');
    if (directContainer) {
      directContainer.remove();
    }

    // 2. Create dedicated direct print container mounted directly on document.body
    directContainer = document.createElement('div');
    directContainer.id = 'invoice-print-direct-container';
    directContainer.appendChild(invoiceEl.cloneNode(true));
    document.body.appendChild(directContainer);

    // 3. Inject print styles with dynamic @page sizing and strict isolation
    let style = document.getElementById('print-page-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'print-page-style';
      document.head.appendChild(style);
    }

    const isThermal = printLayout === 'thermal';
    const pageRule = isThermal
      ? '@page { size: 80mm auto; margin: 0; }'
      : '@page { size: A4 portrait; margin: 8mm; }';

    style.innerHTML = `
      ${pageRule}

      /* Screen: Never display the direct print container on screen */
      @media screen {
        #invoice-print-direct-container {
          display: none !important;
        }
      }

      /* Print: Strictly hide EVERYTHING except the dedicated direct print container */
      @media print {
        html, body {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }

        /* HIDE the entire application tree, modal, backdrop, headers, dashboard */
        body > *:not(#invoice-print-direct-container) {
          display: none !important;
        }

        /* SHOW ONLY the dedicated invoice container */
        #invoice-print-direct-container {
          display: block !important;
          position: static !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
          width: ${isThermal ? '72mm' : '100%'} !important;
          max-width: ${isThermal ? '72mm' : '190mm'} !important;
        }

        #invoice-print-direct-container #sales-invoice-print-area,
        #invoice-print-direct-container #invoice-print-area {
          display: block !important;
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: ${isThermal ? '2mm 0' : '0'} !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
        }

        #invoice-print-direct-container table {
          width: 100% !important;
          table-layout: fixed !important;
        }

        #invoice-print-direct-container tr {
          page-break-inside: avoid !important;
        }

        .print-thermal {
          width: 72mm !important;
          max-width: 72mm !important;
          font-size: 11px !important;
          margin: 0 auto !important;
        }

        .print-a4 {
          width: 190mm !important;
          max-width: 190mm !important;
          font-size: 12px !important;
          margin: 0 auto !important;
        }

        .no-print {
          display: none !important;
        }
      }
    `;

    // 4. Cleanup function after print dialog closes or cancels
    const cleanup = () => {
      const container = document.getElementById('invoice-print-direct-container');
      if (container) container.remove();
      const s = document.getElementById('print-page-style');
      if (s) s.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    // 5. Brief timeout to allow browser layout to stabilize before opening print preview
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (loading) return <div className="py-12 text-center text-slate-400 font-medium">Loading invoice details...</div>;
  if (!sale) return null;

  const ps = PAY_STATUS_CONFIG[sale.payment_status] || PAY_STATUS_CONFIG.UNPAID;
  const ss = STATUS_CONFIG[sale.status] || STATUS_CONFIG.COMPLETED;

  return (
    <div className="space-y-4">
      {/* 1. Modal Top Action Header (no-print) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {sale.sync_status === 'PENDING_SYNC' ? (
            <Badge variant="warning" className="bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1 font-semibold">
              <Clock className="w-3 h-3 text-amber-600" /> PENDING SYNC
            </Badge>
          ) : sale.origin === 'OFFLINE' || sale.sync_status === 'SYNCED' ? (
            <Badge variant="info" className="bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-semibold">
              <CheckCircle className="w-3 h-3 text-blue-600" /> OFFLINE · SYNCED
            </Badge>
          ) : (
            <Badge variant="success" className="bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-semibold">
              <Wifi className="w-3 h-3 text-emerald-600" /> ONLINE
            </Badge>
          )}
          <Badge variant={ss.variant}>{ss.label}</Badge>
          <Badge variant={ps.variant}>{ps.label}</Badge>
          {sale.provisional_number && sale.provisional_number !== sale.invoice_number && (
            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Ref: {sale.provisional_number}
            </span>
          )}
          <span className="text-xs text-slate-500 font-mono">
            {sale.invoice_date}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Format selector: A4 Tax Invoice / 80mm Thermal */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setPrintLayout('a4')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                printLayout === 'a4'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => setPrintLayout('thermal')}
              className={`px-2.5 py-1 font-semibold rounded-md transition-colors ${
                printLayout === 'thermal'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm Thermal
            </button>
          </div>

          <Button
            variant="primary"
            icon={Printer}
            size="sm"
            onClick={handlePrint}
            className="shadow-sm"
          >
            Print Invoice
          </Button>
        </div>
      </div>

      {/* 2. Structured Professional Invoice Document Preview */}
      <div className="receipt-preview-container max-h-[65vh] overflow-y-auto p-4 bg-slate-100/90 rounded-xl flex justify-center border border-slate-200 shadow-inner">
        <div id="sales-invoice-print-area">
          <InvoiceDocument
            invoice={sale}
            printLayout={printLayout}
            business={business}
            currency={currency}
          />
        </div>
      </div>

      {/* Pending Sync Offline Notice */}
      {sale.sync_status === 'PENDING_SYNC' && (
        <div className="no-print p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>This invoice was created offline and is queued for automatic synchronization. Payment adjustments and returns will be available once synced to MySQL.</span>
        </div>
      )}

      {/* Payment Action */}
      {sale.payment_status !== 'PAID' && sale.sync_status !== 'PENDING_SYNC' && (
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
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] focus:outline-none bg-white"
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
      {isAdmin && sale.status !== 'REFUNDED' && sale.status !== 'CANCELLED' && sale.sync_status !== 'PENDING_SYNC' && (
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
  const [filterSyncType, setFilterSyncType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useNotification() || {};

  const handleExportCsv = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await reportService.downloadCsv('sales', `sales-invoices-${Date.now()}.csv`);
      if (toast?.success) {
        toast.success('Sales CSV exported successfully');
      }
    } catch (err) {
      if (toast?.error) {
        toast.error(err.message || 'Failed to export sales CSV');
      }
    } finally {
      setExporting(false);
    }
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search.trim()) params.search = search.trim();
      if (filterStatus) params.status = filterStatus;
      if (filterPayStatus) params.payment_status = filterPayStatus;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (filterSyncType && filterSyncType !== 'ALL') {
        params.sync_type = filterSyncType;
      }

      // 1. Fetch pending offline invoices from IndexedDB
      let localPending = [];
      try {
        localPending = await db.offlineInvoices
          .where('status')
          .equals('PENDING_SYNC')
          .toArray();
      } catch (err) {
        console.warn('IndexedDB offline invoices read error:', err);
      }

      // Format local pending bills
      const formattedPending = localPending.map((p) => ({
        id: p.local_bill_id || p.id,
        invoice_number: p.provisional_number || p.invoice_number,
        provisional_number: p.provisional_number,
        invoice_date: p.invoice_date || p.created_at?.slice(0, 10),
        customer: p.customer,
        grand_total: p.grand_total,
        paid_amount: p.paid_amount,
        balance_due: p.balance_due,
        payment_status: p.payment_status || 'PAID',
        status: p.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
        origin: 'OFFLINE',
        sync_status: 'PENDING_SYNC',
        is_offline: true,
        items: p.items,
        notes: p.notes,
        created_at: p.created_at
      }));

      // Apply client filters to pending offline bills
      const filteredPending = formattedPending.filter((inv) => {
        if (filterPayStatus && inv.payment_status !== filterPayStatus) return false;
        if (filterStatus && inv.status !== filterStatus) return false;
        if (dateFrom && inv.invoice_date < dateFrom) return false;
        if (dateTo && inv.invoice_date > dateTo) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const matchNum = (inv.invoice_number || '').toLowerCase().includes(q);
          const matchProv = (inv.provisional_number || '').toLowerCase().includes(q);
          const matchCust = (inv.customer?.name || '').toLowerCase().includes(q);
          if (!matchNum && !matchProv && !matchCust) return false;
        }
        return true;
      });

      // 2. Fetch server sales
      let serverSales = [];
      let serverMeta = { total: 0, totalPages: 1 };
      let serverAvailable = true;

      try {
        const res = await saleService.list(params);
        serverSales = (res.data?.sales || []).map((s) => ({
          ...s,
          origin: s.origin || (s.notes?.includes('[provisional:') ? 'OFFLINE' : 'ONLINE'),
          sync_status: s.sync_status || (s.notes?.includes('[provisional:') ? 'SYNCED' : 'ONLINE'),
          provisional_number: s.provisional_number || (s.notes?.match(/\[provisional:(OFFLINE-[^\]]+)\]/)?.[1] || null)
        }));
        serverMeta = res.meta || { total: serverSales.length, totalPages: 1 };
      } catch (serverErr) {
        serverAvailable = false;
        console.warn('Backend server unreachable, falling back to local IndexedDB:', serverErr);
      }

      // If server is unreachable, load all records from Dexie IndexedDB
      if (!serverAvailable) {
        let allLocal = [];
        try {
          allLocal = await db.offlineInvoices.toArray();
        } catch {}

        const formattedAll = allLocal.map((p) => ({
          id: p.local_bill_id || p.id,
          invoice_number: p.invoice_number || p.provisional_number,
          provisional_number: p.provisional_number,
          invoice_date: p.invoice_date || p.created_at?.slice(0, 10),
          customer: p.customer,
          grand_total: p.grand_total,
          paid_amount: p.paid_amount,
          balance_due: p.balance_due,
          payment_status: p.payment_status || 'PAID',
          status: p.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
          origin: 'OFFLINE',
          sync_status: p.status === 'SYNCED' ? 'SYNCED' : 'PENDING_SYNC',
          is_offline: p.status !== 'SYNCED',
          items: p.items,
          notes: p.notes,
          created_at: p.created_at
        }));

        const filtered = formattedAll.filter((inv) => {
          if (filterSyncType === 'ONLINE') return false;
          if (filterSyncType === 'PENDING_SYNC' && inv.sync_status !== 'PENDING_SYNC') return false;
          if (filterSyncType === 'SYNCED' && inv.sync_status !== 'SYNCED') return false;
          if (filterPayStatus && inv.payment_status !== filterPayStatus) return false;
          if (filterStatus && inv.status !== filterStatus) return false;
          if (dateFrom && inv.invoice_date < dateFrom) return false;
          if (dateTo && inv.invoice_date > dateTo) return false;
          if (search.trim()) {
            const q = search.trim().toLowerCase();
            const matchNum = (inv.invoice_number || '').toLowerCase().includes(q);
            const matchProv = (inv.provisional_number || '').toLowerCase().includes(q);
            const matchCust = (inv.customer?.name || '').toLowerCase().includes(q);
            if (!matchNum && !matchProv && !matchCust) return false;
          }
          return true;
        });

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / 15));
        const paged = filtered.slice((page - 1) * 15, page * 15);
        setSales(paged);
        setMeta({ total, totalPages });
        return;
      }

      // If server is available, combine pending local bills with server sales
      let combined = [];
      let totalCount = 0;

      if (filterSyncType === 'ONLINE') {
        combined = serverSales.filter((s) => s.origin === 'ONLINE');
        totalCount = serverMeta.total;
      } else if (filterSyncType === 'PENDING_SYNC') {
        combined = filteredPending;
        totalCount = filteredPending.length;
      } else if (filterSyncType === 'SYNCED') {
        combined = serverSales.filter((s) => s.origin === 'OFFLINE' || s.sync_status === 'SYNCED');
        totalCount = serverMeta.total;
      } else if (filterSyncType === 'OFFLINE') {
        const syncedServer = serverSales.filter((s) => s.origin === 'OFFLINE' || s.sync_status === 'SYNCED');
        const pendingNotYetOnServer = filteredPending.filter(
          (p) => !syncedServer.some((s) => s.provisional_number === p.provisional_number)
        );
        combined = [...pendingNotYetOnServer, ...syncedServer];
        totalCount = pendingNotYetOnServer.length + (serverMeta.total || syncedServer.length);
      } else {
        // 'ALL'
        const pendingNotYetOnServer = filteredPending.filter(
          (p) => !serverSales.some((s) => s.provisional_number === p.provisional_number)
        );
        combined = [...pendingNotYetOnServer, ...serverSales];
        totalCount = pendingNotYetOnServer.length + (serverMeta.total || serverSales.length);
      }

      setSales(combined);
      setMeta({
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / 15))
      });
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterPayStatus, filterSyncType, dateFrom, dateTo]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Subscribe to automatic synchronization updates
  useEffect(() => {
    const unsubscribe = syncManager.subscribe(({ isSyncing }) => {
      if (!isSyncing) {
        fetchSales();
      }
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [fetchSales]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sales & Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.total} invoices total</p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle disabled:opacity-60 cursor-pointer"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
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
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
            placeholder="Search invoice or reference number..."
          />
        </div>
        <select
          value={filterSyncType}
          onChange={(e) => {
            setFilterSyncType(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white cursor-pointer"
        >
          <option value="ALL">All Invoices</option>
          <option value="ONLINE">Online Invoices</option>
          <option value="OFFLINE">Offline Invoices</option>
          <option value="PENDING_SYNC">Pending Sync</option>
          <option value="SYNCED">Synced Invoices</option>
        </select>
        <select
          value={filterPayStatus}
          onChange={(e) => {
            setFilterPayStatus(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white cursor-pointer"
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
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0B1120] text-[#D4AF37] border-b-2 border-[#D4AF37]/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Type / Sync</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
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
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 font-medium">
                        <div>{s.invoice_number}</div>
                        {s.provisional_number && s.provisional_number !== s.invoice_number && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Ref: {s.provisional_number}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.invoice_date}</td>
                      <td className="px-4 py-3 text-slate-700">{s.customer?.name || <span className="text-slate-400 italic">Walk-in</span>}</td>
                      <td className="px-4 py-3 text-center">
                        {s.sync_status === 'PENDING_SYNC' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-500" />
                            PENDING SYNC
                          </span>
                        ) : s.origin === 'OFFLINE' || s.sync_status === 'SYNCED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <CheckCircle className="w-3 h-3 text-blue-500" />
                            SYNCED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Wifi className="w-3 h-3 text-emerald-500" />
                            ONLINE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-slate-900">{currency}{parseFloat(s.grand_total || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{currency}{parseFloat(s.paid_amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">
                        {parseFloat(s.balance_due || 0) > 0 ? `${currency}${parseFloat(s.balance_due || 0).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center"><Badge variant={ps?.variant}>{ps?.label}</Badge></td>
                      <td className="px-4 py-3 text-center"><Badge variant={ss?.variant}>{ss?.label}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedSaleId(s.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="View Invoice"
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

      <Modal isOpen={!!selectedSaleId} onClose={() => setSelectedSaleId(null)} title="Invoice Details" size="xl">
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
