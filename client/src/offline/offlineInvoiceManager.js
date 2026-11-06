/**
 * BUSINESSFLOW — Offline Invoice Generation & Queueing Manager
 * Manages provisional offline billing, strict payment status resolution,
 * local stock decrement, and transactional queueing in IndexedDB.
 */

import { db, logSyncEvent } from './db.js';

/**
 * Generate a unique UUID (v4)
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a provisional offline invoice reference.
 * Format: OFFLINE-YYYYMMDD-XXXX (strictly distinguished from server INV-YYYYMMDD-XXXX)
 */
export function generateProvisionalReference() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OFFLINE-${year}${month}${day}-${rand}`;
}

export const offlineInvoiceManager = {
  /**
   * Create an offline invoice and commit atomically to IndexedDB
   */
  async createOfflineInvoice({
    cart,
    selectedCustomer,
    pricingMode = 'WHOLESALE',
    orderDiscount = 0,
    paymentMode = 'CASH',
    splitPayments = [],
    cashAmount = 0,
    upiAmount = 0,
    upiRef = '',
    cardRef = '',
    creditAmount = 0,
    business = {},
    user = {},
    isPaymentConfirmed = false,
    paymentConfirmed = false
  }) {
    if (!cart || cart.length === 0) {
      throw new Error('Invoice must contain at least one product item');
    }

    const localBillId = generateUUID();
    const provisionalRef = generateProvisionalReference();
    const nowIso = new Date().toISOString();
    const nowTime = nowIso.slice(0, 10);

    // 1. Determine Interstate vs Intrastate GST
    const businessState = (business?.state || '').trim().toLowerCase();
    const customerState = (selectedCustomer?.state || '').trim().toLowerCase();
    const isInterState = Boolean(businessState && customerState && businessState !== customerState);

    // 2. Compute Item Line Totals, Taxes, and Packaging Units
    let subtotal = 0;
    let itemDiscountTotal = 0;
    let taxTotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const items = cart.map((item) => {
      const qty = parseInt(item.quantity, 10) || 1;
      const unitPrice = parseFloat(item.unit_price || 0);
      const gross = qty * unitPrice;
      const discAmt = parseFloat(item.discount_amount || 0);
      const taxable = Math.max(0, gross - discAmt);
      const taxRate = parseFloat(item.tax_rate || 0);
      const taxAmt = taxable * (taxRate / 100);
      const lineTotal = taxable + taxAmt;

      subtotal += gross;
      itemDiscountTotal += discAmt;
      taxTotal += taxAmt;

      if (isInterState) {
        igstTotal += taxAmt;
      } else {
        cgstTotal += taxAmt / 2;
        sgstTotal += taxAmt / 2;
      }

      return {
        product_id: item.product_id || item.id,
        product_name: item.name || 'Product',
        product_sku: item.sku || '',
        barcode: item.barcode || '',
        batch_number: item.batch_number || null,
        expiry_date: item.expiry_date || null,
        unit_name: item.pack_unit || item.unit_name || 'PCS',
        quantity: qty,
        free_quantity: parseInt(item.free_quantity, 10) || 0,
        unit_price: unitPrice,
        unit_selling_price: unitPrice,
        gross_amount: gross,
        discount_amount: discAmt,
        taxable_amount: taxable,
        tax_rate: taxRate,
        tax_amount: taxAmt,
        cgst_amount: isInterState ? 0 : taxAmt / 2,
        sgst_amount: isInterState ? 0 : taxAmt / 2,
        igst_amount: isInterState ? taxAmt : 0,
        line_total: lineTotal
      };
    });

    // 3. Monetary Summaries & Round-off
    const orderDisc = parseFloat(orderDiscount || 0);
    const totalDiscount = itemDiscountTotal + orderDisc;
    const rawTotal = Math.max(0, subtotal - totalDiscount + taxTotal);
    const grandTotal = Math.round(rawTotal);
    const roundOff = grandTotal - rawTotal;

    // 4. Resolve Payment Breakdown & Strict Statuses
    let calculatedPaid = 0;
    const paymentRecords = [];
    const effectiveMode = (!selectedCustomer && paymentMode === 'CREDIT') ? 'CASH' : paymentMode;
    const hasVerifiedConfirmation = Boolean(isPaymentConfirmed || paymentConfirmed);

    if (effectiveMode === 'CASH') {
      calculatedPaid = grandTotal;
      paymentRecords.push({
        method: 'CASH',
        amount: grandTotal,
        status: 'PAID',
        notes: 'Cash collected offline'
      });
    } else if (effectiveMode === 'UPI') {
      const isUpiConfirmed = hasVerifiedConfirmation;
      if (isUpiConfirmed) {
        calculatedPaid = grandTotal;
      }
      paymentRecords.push({
        method: 'UPI',
        amount: grandTotal,
        reference_number: upiRef || '',
        status: isUpiConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
        notes: isUpiConfirmed
          ? (upiRef ? `Offline UPI (Confirmed - Ref: ${upiRef})` : 'Offline UPI (Confirmed)')
          : (upiRef ? `Offline UPI (Pending Confirmation - Ref: ${upiRef})` : 'Offline UPI (Pending Confirmation)')
      });
    } else if (effectiveMode === 'CARD') {
      const isCardConfirmed = hasVerifiedConfirmation;
      if (isCardConfirmed) {
        calculatedPaid = grandTotal;
      }
      paymentRecords.push({
        method: 'CARD',
        amount: grandTotal,
        reference_number: cardRef || upiRef || '',
        status: isCardConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
        notes: isCardConfirmed
          ? 'Offline Card (Confirmed)'
          : 'Offline Card (Pending Confirmation)'
      });
    } else if (effectiveMode === 'CREDIT') {
      calculatedPaid = 0;
      paymentRecords.push({
        method: 'CREDIT',
        amount: grandTotal,
        status: 'OUTSTANDING',
        notes: 'Debited to customer ledger'
      });
    } else if (effectiveMode === 'SPLIT') {
      if (Array.isArray(splitPayments) && splitPayments.length > 0) {
        splitPayments.forEach((p) => {
          const amt = parseFloat(p.amount || 0);
          if (amt > 0) {
            const method = (p.method || p.payment_method || 'CASH').toUpperCase();
            const isConfirmed = Boolean(p.is_confirmed || p.paymentConfirmed || p.verified || (p.status === 'PAID') || hasVerifiedConfirmation);

            if (method === 'CASH') {
              calculatedPaid += amt;
              paymentRecords.push({
                method: 'CASH',
                amount: amt,
                reference_number: p.reference || p.reference_number || '',
                status: 'PAID',
                notes: p.notes || 'Split Cash'
              });
            } else if (method === 'CREDIT') {
              paymentRecords.push({
                method: 'CREDIT',
                amount: amt,
                reference_number: p.reference || p.reference_number || '',
                status: 'OUTSTANDING',
                notes: p.notes || 'Split Credit'
              });
            } else if (method === 'UPI') {
              if (isConfirmed) {
                calculatedPaid += amt;
              }
              const ref = p.reference || p.reference_number || upiRef || '';
              paymentRecords.push({
                method: 'UPI',
                amount: amt,
                reference_number: ref,
                status: isConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
                notes: p.notes || (isConfirmed
                  ? (ref ? `Split UPI (Confirmed - Ref: ${ref})` : 'Split UPI (Confirmed)')
                  : (ref ? `Split UPI (Pending Confirmation - Ref: ${ref})` : 'Split UPI (Pending Confirmation)'))
              });
            } else if (method === 'CARD') {
              if (isConfirmed) {
                calculatedPaid += amt;
              }
              const ref = p.reference || p.reference_number || cardRef || '';
              paymentRecords.push({
                method: 'CARD',
                amount: amt,
                reference_number: ref,
                status: isConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
                notes: p.notes || (isConfirmed ? 'Split Card (Confirmed)' : 'Split Card (Pending Confirmation)')
              });
            } else {
              if (isConfirmed) {
                calculatedPaid += amt;
              }
              paymentRecords.push({
                method,
                amount: amt,
                reference_number: p.reference || p.reference_number || '',
                status: isConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
                notes: p.notes || `Split ${method}`
              });
            }
          }
        });
      } else {
        const cashAmt = parseFloat(cashAmount || 0);
        const upiAmt = parseFloat(upiAmount || 0);
        const credAmt = parseFloat(creditAmount || 0);
        if (cashAmt > 0) {
          calculatedPaid += cashAmt;
          paymentRecords.push({ method: 'CASH', amount: cashAmt, status: 'PAID', notes: 'Split Cash' });
        }
        if (upiAmt > 0) {
          const isUpiConfirmed = hasVerifiedConfirmation;
          if (isUpiConfirmed) {
            calculatedPaid += upiAmt;
          }
          paymentRecords.push({
            method: 'UPI',
            amount: upiAmt,
            reference_number: upiRef || '',
            status: isUpiConfirmed ? 'PAID' : 'PENDING_CONFIRMATION',
            notes: isUpiConfirmed
              ? (upiRef ? `Split UPI (Confirmed - Ref: ${upiRef})` : 'Split UPI (Confirmed)')
              : (upiRef ? `Split UPI (Pending Confirmation - Ref: ${upiRef})` : 'Split UPI (Pending Confirmation)')
          });
        }
        if (credAmt > 0) {
          paymentRecords.push({ method: 'CREDIT', amount: credAmt, status: 'OUTSTANDING', notes: 'Split Credit' });
        }
      }
    }

    const balanceDue = Math.max(0, grandTotal - calculatedPaid);
    let paymentStatus = 'PAID';
    const hasUnconfirmedPayments = paymentRecords.some((p) => p.status === 'PENDING_CONFIRMATION');

    if (calculatedPaid >= grandTotal && grandTotal > 0) {
      paymentStatus = 'PAID';
    } else if (calculatedPaid > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    } else if (hasUnconfirmedPayments) {
      paymentStatus = 'PENDING_CONFIRMATION';
    } else {
      paymentStatus = 'UNPAID';
    }

    // 5. Build Offline Invoice Record
    const offlineInvoice = {
      local_bill_id: localBillId,
      provisional_number: provisionalRef,
      invoice_number: provisionalRef, // Will be mapped to server INV-XXXX on sync
      idempotency_key: localBillId,
      is_offline: true,
      status: 'PENDING_SYNC',
      created_at: nowIso,
      invoice_date: nowTime,
      pricing_mode: pricingMode,
      business_id: business?.id || 1,
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      customer: selectedCustomer || null,
      cashier: {
        id: user?.id || null,
        name: user?.name || 'Cashier',
        role: user?.role || 'STAFF'
      },
      business: {
        name: business?.name || 'BUSINESSFLOW WHOLESALE',
        address: business?.address || '',
        phone: business?.phone || '',
        tax_number: business?.tax_number || '',
        state: business?.state || '',
        currency_symbol: '₹'
      },
      items,
      subtotal: subtotal.toFixed(2),
      discount_total: totalDiscount.toFixed(2),
      order_discount: orderDisc.toFixed(2),
      tax_total: taxTotal.toFixed(2),
      cgst_total: cgstTotal.toFixed(2),
      sgst_total: sgstTotal.toFixed(2),
      igst_total: igstTotal.toFixed(2),
      round_off: roundOff.toFixed(2),
      grand_total: grandTotal.toFixed(2),
      net_amount: grandTotal.toFixed(2),
      paid_amount: calculatedPaid.toFixed(2),
      balance_due: balanceDue.toFixed(2),
      payment_mode: effectiveMode,
      payment_status: paymentStatus,
      payments: paymentRecords
    };

    // 6. Build Backend Sync Payload
    const syncPayload = {
      local_bill_id: localBillId,
      provisional_number: provisionalRef,
      idempotency_key: localBillId,
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      order_discount: orderDisc,
      payment_mode: effectiveMode,
      paid_amount: calculatedPaid,
      payments: paymentRecords.map((p) => ({
        method: p.method,
        amount: p.amount,
        reference_number: p.reference_number || undefined,
        notes: p.notes
      })),
      notes: `Offline POS Bill [idempotency:${localBillId}] [provisional:${provisionalRef}]`,
      items: items.map((it) => ({
        product_id: it.product_id,
        batch_number: it.batch_number,
        unit_name: it.unit_name,
        quantity: it.quantity,
        free_quantity: it.free_quantity,
        unit_price: it.unit_price,
        discount_amount: it.discount_amount
      }))
    };

    // 7. Atomic Dexie Transaction
    await db.transaction('rw', [db.offlineInvoices, db.syncQueue, db.products, db.customers, db.activeCart, db.syncLogs], async () => {
      // a. Save invoice
      await db.offlineInvoices.put(offlineInvoice);

      // b. Enqueue sync task
      await db.syncQueue.put({
        id: localBillId,
        type: 'INVOICE_CREATE',
        status: 'PENDING',
        payload: syncPayload,
        created_at: nowIso,
        retry_count: 0
      });

      // c. Decrement local product stock in IndexedDB
      for (const item of items) {
        const product = await db.products.get(item.product_id);
        if (product) {
          const currentStock = parseFloat(product.stock_quantity || 0);
          const deductQty = item.quantity;
          await db.products.update(item.product_id, {
            stock_quantity: Math.max(0, currentStock - deductQty)
          });
        }
      }

      // d. If credit payment with selected customer, update local customer outstanding balance
      const creditToDebit = paymentRecords
        .filter((p) => p.method === 'CREDIT')
        .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

      if (selectedCustomer && creditToDebit > 0) {
        const cust = await db.customers.get(selectedCustomer.id);
        if (cust) {
          const currentBal = parseFloat(cust.outstanding_balance || 0);
          await db.customers.update(selectedCustomer.id, {
            outstanding_balance: currentBal + creditToDebit
          });
        }
      }

      // e. Clear active cart
      await db.activeCart.delete('current_pos_cart');

      // f. Log audit record
      await logSyncEvent('OFFLINE_BILL_CREATED', 'SUCCESS', {
        localBillId,
        provisionalRef,
        grandTotal,
        itemCount: items.length
      });
    });

    return offlineInvoice;
  },

  /**
   * Retrieve all pending offline bills
   */
  async getPendingBills() {
    try {
      return await db.offlineInvoices.where('status').equals('PENDING_SYNC').toArray();
    } catch (err) {
      console.warn('[OfflineInvoice] Failed to fetch pending bills:', err);
      return [];
    }
  },

  /**
   * Mark an offline invoice as synced with official server invoice details
   */
  async markAsSynced(localBillId, serverInvoice) {
    try {
      await db.transaction('rw', [db.offlineInvoices, db.syncQueue, db.syncLogs], async () => {
        await db.offlineInvoices.update(localBillId, {
          status: 'SYNCED',
          is_offline: false,
          server_invoice_id: serverInvoice.id || serverInvoice.invoice_id,
          server_invoice_number: serverInvoice.invoice_number,
          invoice_number: serverInvoice.invoice_number, // associate official number
          synced_at: new Date().toISOString()
        });

        await db.syncQueue.update(localBillId, {
          status: 'SYNCED',
          synced_at: new Date().toISOString()
        });

        await logSyncEvent('BILL_SYNCED', 'SUCCESS', {
          localBillId,
          officialInvoiceNumber: serverInvoice.invoice_number
        });
      });
    } catch (err) {
      console.error('[OfflineInvoice] Failed to mark as synced:', err);
    }
  }
};

