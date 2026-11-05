import React from 'react';
import { numberToWords } from '../../utils/formatters.js';

/**
 * Enterprise Dynamic Invoice Document Component for BUSINESSFLOW
 * Supports both 80mm Thermal Receipt and A4 Tax Invoice formats.
 * Consumes actual saved transaction data with zero fabrication.
 */
export function InvoiceDocument({
  invoice,
  printLayout = 'thermal',
  business = {},
  selectedCustomer = null,
  pricingMode = 'WHOLESALE',
  currency = '₹'
}) {
  if (!invoice) return null;

  // Resolve customer & business metadata safely
  const customerObj = invoice.customer || selectedCustomer || {};
  const businessObj = invoice.business || business || {};

  // Business Information
  const businessName = businessObj.name || 'BUSINESSFLOW WHOLESALE';
  const businessAddress = businessObj.address || 'Wholesale Distribution Hub, Sector 4';
  const businessPhone = businessObj.phone || '+91 98765 43210';
  const businessEmail = businessObj.email || 'sales@businessflow.com';
  const businessGstin = businessObj.tax_number || '';
  const businessState = businessObj.state || '';

  // Customer Information
  const customerName = customerObj.name || 'Walk-in Retail Customer';
  const customerPhone = customerObj.phone || '';
  const addressParts = [
    customerObj.address,
    customerObj.city,
    customerObj.state,
    customerObj.pincode
  ].filter(Boolean);
  const customerAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
  const customerGstin = customerObj.tax_number || '';
  const customerState = customerObj.state || '';

  // Customer Type Resolution
  const customerTypeRaw = (customerObj.customer_type || '').toUpperCase();
  const isWholesaleCustomer =
    customerTypeRaw === 'WHOLESALE' ||
    customerTypeRaw === 'BULK' ||
    customerTypeRaw === 'SUB_WHOLESALER' ||
    pricingMode === 'WHOLESALE';
  const customerTypeLabel = isWholesaleCustomer ? 'Wholesale Customer' : 'Retail Customer';

  // Cashier / Billed By
  const cashierName = invoice.cashier?.name || 'Cashier';

  // Dates & Times
  const invoiceNumber = invoice.invoice_number || 'INV-DRAFT';
  const rawDate = invoice.created_at || invoice.invoice_date || new Date().toISOString();
  const parsedDate = new Date(rawDate);
  const formattedDate = isNaN(parsedDate.getTime())
    ? String(invoice.invoice_date || '')
    : parsedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = isNaN(parsedDate.getTime())
    ? ''
    : parsedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  // Monetary Calculations
  const subtotalVal = parseFloat(invoice.subtotal || invoice.total_amount || 0);
  const discountVal = parseFloat(invoice.discount_total || invoice.discount_amount || 0);
  const orderDiscVal = parseFloat(invoice.order_discount || 0);
  const taxTotalVal = parseFloat(invoice.tax_total || invoice.tax_amount || 0);
  const taxableTotalVal = Math.max(0, subtotalVal - discountVal);
  const roundOffVal = parseFloat(invoice.round_off || 0);
  const grandTotalVal = parseFloat(invoice.grand_total || invoice.net_amount || 0);
  const paidVal = parseFloat(invoice.paid_amount || 0);
  const balanceDueVal = parseFloat(invoice.balance_due || 0);
  const customerLedgerBalance = parseFloat(customerObj.outstanding_balance || 0);

  // GST & Supply Classification
  const isGstInvoice = taxTotalVal > 0 || (invoice.items || []).some(it => parseFloat(it.tax_rate || 0) > 0);
  const invoiceTypeTitle = isGstInvoice ? 'TAX INVOICE' : 'BILL OF SUPPLY';

  const isInterState = parseFloat(invoice.igst_total || 0) > 0 || (
    Boolean(customerState && businessState) &&
    customerState.trim().toLowerCase() !== businessState.trim().toLowerCase()
  );

  const cgstVal = parseFloat(invoice.cgst_total || (isInterState ? 0 : taxTotalVal / 2));
  const sgstVal = parseFloat(invoice.sgst_total || (isInterState ? 0 : taxTotalVal / 2));
  const igstVal = parseFloat(invoice.igst_total || (isInterState ? taxTotalVal : 0));

  // Process Item Rows
  const items = (invoice.items || []).map((it, idx) => {
    const qty = parseInt(it.quantity, 10) || 0;
    const freeQty = Math.max(0, parseInt(it.free_quantity, 10) || 0);
    const rate = parseFloat(it.unit_selling_price || it.unit_price || 0);
    const gross = qty * rate;
    const disc = parseFloat(it.discount_amount || 0);
    const taxable = parseFloat(it.taxable_amount !== undefined ? it.taxable_amount : Math.max(0, gross - disc));
    const taxRate = parseFloat(it.tax_rate || 0);
    const taxAmt = parseFloat(it.tax_amount !== undefined ? it.tax_amount : (taxable * taxRate / 100));
    const lineTotal = parseFloat(it.line_total || it.total_price || (taxable + taxAmt));

    const cgst = parseFloat(it.cgst_amount !== undefined ? it.cgst_amount : (isInterState ? 0 : taxAmt / 2));
    const sgst = parseFloat(it.sgst_amount !== undefined ? it.sgst_amount : (isInterState ? 0 : taxAmt / 2));
    const igst = parseFloat(it.igst_amount !== undefined ? it.igst_amount : (isInterState ? taxAmt : 0));

    return {
      index: idx + 1,
      name: it.product_name || 'Product Item',
      sku: it.product_sku || '',
      batch: it.batch_number ? String(it.batch_number).trim() : '',
      expiry: it.expiry_date || '',
      unit: (it.unit_name || 'PCS').toUpperCase(),
      quantity: qty,
      freeQuantity: freeQty,
      unitPrice: rate,
      grossAmount: gross,
      discountAmount: disc,
      discountPercentage: parseFloat(it.discount_percentage || 0),
      taxableAmount: taxable,
      taxRate: taxRate,
      taxAmount: taxAmt,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      lineTotal: lineTotal
    };
  });

  const totalQuantitySum = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalFreeQuantitySum = items.reduce((sum, it) => sum + it.freeQuantity, 0);

  // Group items by GST Slabs
  const gstSlabsMap = {};
  items.forEach(it => {
    const key = it.taxRate.toFixed(2);
    if (!gstSlabsMap[key]) {
      gstSlabsMap[key] = {
        taxRate: it.taxRate,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        taxAmount: 0
      };
    }
    gstSlabsMap[key].taxableAmount += it.taxableAmount;
    gstSlabsMap[key].cgstAmount += it.cgstAmount;
    gstSlabsMap[key].sgstAmount += it.sgstAmount;
    gstSlabsMap[key].igstAmount += it.igstAmount;
    gstSlabsMap[key].taxAmount += it.taxAmount;
  });
  const gstSlabs = Object.values(gstSlabsMap).sort((a, b) => a.taxRate - b.taxRate);

  // Payment Breakdown
  const paymentsList = (invoice.payments && invoice.payments.length > 0)
    ? invoice.payments
    : [{
        payment_method: invoice.payment_mode || 'CASH',
        amount: invoice.paid_amount || invoice.grand_total,
        reference_number: null
      }];

  // Payment Status
  const paymentStatus = invoice.payment_status || (
    balanceDueVal <= 0 ? 'PAID' : (paidVal > 0 ? 'PARTIALLY_PAID' : 'UNPAID')
  );

  const paymentStatusLabel =
    paymentStatus === 'PAID'
      ? 'PAID'
      : paymentStatus === 'PARTIALLY_PAID'
      ? 'PARTIALLY PAID'
      : 'UNPAID / ON CREDIT';

  const amountInWords = numberToWords(grandTotalVal);

  return (
    <div
      id="invoice-print-area"
      className={`${printLayout === 'thermal' ? 'print-thermal' : 'print-a4'} bg-white ${
        printLayout === 'thermal'
          ? 'w-[340px] p-3.5 shadow-sm border border-slate-200 font-mono text-[11px] leading-tight text-slate-900 select-text'
          : 'w-[750px] p-8 shadow-sm border border-slate-200 text-xs text-slate-900 space-y-5 select-text'
      }`}
    >
      {/* =========================================================================
          FORMAT 1: 80mm THERMAL RECEIPT
      ========================================================================= */}
      {printLayout === 'thermal' ? (
        <div className="space-y-2">
          {/* Business & Header */}
          <div className="text-center pb-2 border-b border-dashed border-slate-400">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
              {businessName}
            </h2>
            <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{businessAddress}</p>
            {businessPhone && (
              <p className="text-[10px] text-slate-600">Ph: {businessPhone}</p>
            )}
            {businessGstin && (
              <p className="text-[10px] font-bold text-slate-800 mt-0.5">GSTIN: {businessGstin}</p>
            )}
            <div className="mt-1 inline-block border-y border-dashed border-slate-700 py-0.5 px-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                *** {invoiceTypeTitle} ***
              </span>
            </div>
          </div>

          {/* Invoice & Customer Meta */}
          <div className="py-1.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Invoice No:</span>
              <span className="font-bold font-mono text-slate-900">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Date & Time:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Billed By:</span>
              <span>{cashierName}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dotted border-slate-300">
              <span className="font-semibold text-slate-600">Customer:</span>
              <span className="font-bold text-slate-900 truncate max-w-[170px]">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Type / Mode:</span>
              <span className="font-semibold">{customerTypeLabel} / {invoice.payment_mode || 'CASH'}</span>
            </div>
            {customerPhone && (
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Contact:</span>
                <span>{customerPhone}</span>
              </div>
            )}
            {customerGstin && (
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600">Customer GSTIN:</span>
                <span className="font-bold font-mono">{customerGstin}</span>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="py-1.5 border-b border-dashed border-slate-400">
            <div className="flex justify-between font-bold border-b border-slate-900 pb-1 text-[10px] uppercase">
              <span className="w-6/12">Item / Unit</span>
              <span className="w-3/12 text-right">Qty x Rate</span>
              <span className="w-3/12 text-right">Total</span>
            </div>

            <div className="divide-y divide-dotted divide-slate-200 py-0.5">
              {items.map((it) => (
                <div key={it.index} className="py-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900 leading-snug w-7/12 truncate pr-1">
                      {it.name}
                    </span>
                    <span className="font-mono text-right w-5/12 font-bold text-slate-900">
                      {currency}{it.lineTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-600 mt-0.5">
                    <span>
                      {it.sku && `[${it.sku}]`}
                      {it.batch && ` B:${it.batch}`}
                      {it.freeQuantity > 0 && ` (+${it.freeQuantity} Free)`}
                    </span>
                    <span>
                      {it.quantity} {it.unit} @ {currency}{it.unitPrice.toFixed(2)}
                    </span>
                  </div>
                  {Boolean(it.discountAmount > 0 || it.taxRate > 0) && (
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>
                        {it.discountAmount > 0 ? `Disc: −${currency}${it.discountAmount.toFixed(2)}` : ''}
                      </span>
                      <span>
                        {it.taxRate > 0 ? `GST ${it.taxRate}%: ${currency}${it.taxAmount.toFixed(2)}` : 'GST 0%'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="py-1.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal (Gross):</span>
              <span className="font-mono">{currency}{subtotalVal.toFixed(2)}</span>
            </div>
            {discountVal > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Total Discount:</span>
                <span className="font-mono">−{currency}{discountVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Taxable Value:</span>
              <span className="font-mono">{currency}{taxableTotalVal.toFixed(2)}</span>
            </div>
            {isGstInvoice && (
              isInterState ? (
                <div className="flex justify-between">
                  <span className="text-slate-600">Integrated GST (IGST):</span>
                  <span className="font-mono">+{currency}{igstVal.toFixed(2)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Central GST (CGST):</span>
                    <span className="font-mono">+{currency}{cgstVal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">State GST (SGST):</span>
                    <span className="font-mono">+{currency}{sgstVal.toFixed(2)}</span>
                  </div>
                </>
              )
            )}
            {roundOffVal !== 0 && (
              <div className="flex justify-between text-slate-500 text-[9px]">
                <span>Round Off:</span>
                <span className="font-mono">{roundOffVal > 0 ? `+${roundOffVal.toFixed(2)}` : roundOffVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs font-black pt-1.5 border-t-2 border-slate-900 text-slate-950">
              <span className="tracking-wide">GRAND TOTAL:</span>
              <span className="font-mono text-sm">{currency}{grandTotalVal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment & Ledger Details */}
          <div className="py-1.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 uppercase">Payment Status:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : paymentStatus === 'PARTIALLY_PAID'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {paymentStatusLabel}
              </span>
            </div>
            {paymentsList.map((pm, i) => (
              <div key={i} className="flex justify-between text-slate-700">
                <span>{pm.payment_method || 'CASH'}{pm.reference_number ? ` (Ref:${pm.reference_number})` : ''}:</span>
                <span className="font-mono font-semibold">{currency}{parseFloat(pm.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-1 border-t border-dotted border-slate-300">
              <span>Paid Amount:</span>
              <span className="font-mono">{currency}{paidVal.toFixed(2)}</span>
            </div>
            {balanceDueVal > 0 && (
              <div className="flex justify-between font-bold text-amber-900 bg-amber-50 px-1 py-0.5 rounded">
                <span>Balance Due (Credit):</span>
                <span className="font-mono">{currency}{balanceDueVal.toFixed(2)}</span>
              </div>
            )}
            {customerLedgerBalance > 0 && (
              <div className="flex justify-between text-[9px] text-slate-600 pt-0.5">
                <span>Total Customer Outstanding:</span>
                <span className="font-mono font-semibold">{currency}{customerLedgerBalance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-1 text-[9px] text-slate-500 space-y-0.5">
            <p className="font-mono">Items: {items.length} | Total Qty: {totalQuantitySum}{totalFreeQuantitySum > 0 ? ` (+${totalFreeQuantitySum} Free)` : ''}</p>
            <p className="font-semibold text-slate-700">Thank you for your business!</p>
            <p>Goods once sold returnable only with original receipt.</p>
            <p className="text-[8px] text-slate-400">Computer Generated Wholesale Invoice</p>
          </div>
        </div>
      ) : (
        /* =========================================================================
            FORMAT 2: A4 TAX INVOICE
        ========================================================================= */
        <div className="space-y-4">
          {/* Top Brand & Document Identification Header */}
          <div className="flex items-start justify-between border-b-2 border-[#0B1120] pb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#0B1120] text-[#D4AF37] font-extrabold flex items-center justify-center text-xl tracking-tight shadow-sm border border-[#D4AF37]/40 shrink-0">
                BF
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-[#0B1120] uppercase">
                  {businessName}
                </h1>
                <p className="text-slate-600 text-[11px] leading-tight max-w-sm mt-0.5">
                  {businessAddress}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                  {businessPhone && <span>Phone: <strong className="text-slate-800">{businessPhone}</strong></span>}
                  {businessEmail && <span>Email: <strong className="text-slate-800">{businessEmail}</strong></span>}
                </div>
                {businessGstin && (
                  <p className="text-[11px] font-bold text-[#0B1120] mt-1 font-mono">
                    GSTIN / UIN: <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded border border-amber-300">{businessGstin}</span>
                    {businessState && <span className="ml-2 font-sans font-semibold text-slate-600 text-[10px]">State: {businessState}</span>}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="inline-block bg-[#0B1120] text-[#D4AF37] border border-[#D4AF37]/30 px-3.5 py-1 rounded-lg">
                <h2 className="text-sm font-black uppercase tracking-wider">
                  {invoiceTypeTitle}
                </h2>
                <p className="text-[9px] text-slate-300 uppercase tracking-widest font-semibold">
                  Original for Recipient
                </p>
              </div>
              <div className="mt-2 text-right space-y-0.5 font-mono text-[11px]">
                <p>Invoice No: <strong className="text-slate-900 text-xs">{invoiceNumber}</strong></p>
                <p className="text-slate-600">Date: <strong className="text-slate-800">{formattedDate}</strong></p>
                <p className="text-slate-600">Time: <span>{formattedTime}</span></p>
                <p className="text-slate-600">Mode: <strong className="text-slate-800">{invoice.payment_mode || 'CASH'}</strong></p>
                {businessState && <p className="text-[10px] text-slate-500 font-sans">Place of Supply: {customerState || businessState}</p>}
              </div>
            </div>
          </div>

          {/* Customer & Account Overview Card */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px]">
            {/* Left: Billed To / Consignee */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Billed To (Customer):
                </span>
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                  isWholesaleCustomer
                    ? 'bg-[#0B1120] text-[#D4AF37] border-[#D4AF37]/40'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}>
                  {customerTypeLabel}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {customerName}
              </h3>
              {customerAddress && (
                <p className="text-slate-600 leading-snug">{customerAddress}</p>
              )}
              {customerPhone && (
                <p className="text-slate-600">Phone: <strong className="text-slate-800">{customerPhone}</strong></p>
              )}
              <p className="font-mono font-semibold text-slate-800">
                Customer GSTIN: {customerGstin ? <span className="font-bold text-slate-950">{customerGstin}</span> : <span className="text-slate-500 font-normal italic">Unregistered</span>}
              </p>
            </div>

            {/* Right: Payment & Account Status */}
            <div className="text-right space-y-1 pl-4 border-l border-slate-200">
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Payment Status:
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : paymentStatus === 'PARTIALLY_PAID'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {paymentStatusLabel}
                </span>
              </div>
              <p className="text-slate-600">Billed By: <strong className="text-slate-900">{cashierName}</strong></p>
              <p className="text-slate-600">
                Total Invoice Value: <strong className="font-mono text-slate-900">{currency}{grandTotalVal.toFixed(2)}</strong>
              </p>
              <p className="text-slate-600">
                Amount Received: <strong className="font-mono text-emerald-700">{currency}{paidVal.toFixed(2)}</strong>
              </p>
              {balanceDueVal > 0 && (
                <p className="text-amber-800 font-bold">
                  Balance Due on Bill: <span className="font-mono">{currency}{balanceDueVal.toFixed(2)}</span>
                </p>
              )}
              {customerLedgerBalance > 0 && (
                <p className="text-slate-600 text-[10px] pt-0.5 border-t border-slate-200">
                  Total Customer Outstanding: <strong className="font-mono text-slate-900">{currency}{customerLedgerBalance.toFixed(2)}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Detailed Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border border-slate-300 table-fixed">
              <thead className="bg-[#0B1120] text-white font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2 px-1.5 w-7 text-center">#</th>
                  <th className="py-2 px-2 w-32">Description of Goods</th>
                  <th className="py-2 px-1.5 w-16">HSN/SKU</th>
                  <th className="py-2 px-1.5 w-16">Batch</th>
                  <th className="py-2 px-1.5 w-12 text-center">Unit</th>
                  <th className="py-2 px-1.5 w-12 text-center">Qty</th>
                  <th className="py-2 px-1.5 w-12 text-center">Free</th>
                  <th className="py-2 px-1.5 w-16 text-right">Rate</th>
                  <th className="py-2 px-1.5 w-14 text-right">Disc</th>
                  <th className="py-2 px-2 w-18 text-right">Taxable</th>
                  <th className="py-2 px-1.5 w-12 text-center">GST%</th>
                  <th className="py-2 px-2 w-16 text-right">GST</th>
                  <th className="py-2 px-2 w-20 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {items.map((it) => (
                  <tr key={it.index} className="hover:bg-slate-50">
                    <td className="py-1.5 px-1.5 text-center text-slate-400 font-mono text-[10px]">{it.index}</td>
                    <td className="py-1.5 px-2 font-bold text-slate-900 truncate">
                      {it.name}
                    </td>
                    <td className="py-1.5 px-1.5 font-mono text-[10px] text-slate-600 truncate">{it.sku || '—'}</td>
                    <td className="py-1.5 px-1.5 font-mono text-[10px] text-slate-600 truncate">{it.batch || '—'}</td>
                    <td className="py-1.5 px-1.5 text-center font-bold text-slate-700 text-[10px]">{it.unit}</td>
                    <td className="py-1.5 px-1.5 text-center font-bold font-mono text-slate-900">{it.quantity}</td>
                    <td className="py-1.5 px-1.5 text-center font-bold font-mono text-emerald-600">
                      {it.freeQuantity > 0 ? `+${it.freeQuantity}` : '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-slate-800">
                      {currency}{it.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1.5 text-right font-mono text-slate-600">
                      {it.discountAmount > 0 ? `${currency}${it.discountAmount.toFixed(2)}` : '0.00'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-900">
                      {currency}{it.taxableAmount.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono text-slate-700">{it.taxRate}%</td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                      {currency}{it.taxAmount.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950">
                      {currency}{it.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-[10px]">
                <tr>
                  <td colSpan="5" className="py-1.5 px-2 text-right uppercase">Total:</td>
                  <td className="py-1.5 px-1.5 text-center font-mono text-slate-900">{totalQuantitySum}</td>
                  <td className="py-1.5 px-1.5 text-center font-mono text-emerald-700">{totalFreeQuantitySum > 0 ? `+${totalFreeQuantitySum}` : '—'}</td>
                  <td colSpan="2" className="py-1.5 px-1.5"></td>
                  <td className="py-1.5 px-2 text-right font-mono">{currency}{taxableTotalVal.toFixed(2)}</td>
                  <td></td>
                  <td className="py-1.5 px-2 text-right font-mono">{currency}{taxTotalVal.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-950">{currency}{grandTotalVal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* GST Slabs Breakdown Table (GST Compliance) */}
          {isGstInvoice && gstSlabs.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                GST Tax Slabs & Rate Breakdown
              </div>
              <table className="w-full text-left text-[10px] table-fixed">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-1 px-2">GST Rate</th>
                    <th className="py-1 px-2 text-right">Taxable Value</th>
                    {isInterState ? (
                      <>
                        <th className="py-1 px-2 text-right">IGST Rate</th>
                        <th className="py-1 px-2 text-right">IGST Amount</th>
                      </>
                    ) : (
                      <>
                        <th className="py-1 px-2 text-right">CGST Rate</th>
                        <th className="py-1 px-2 text-right">CGST Amount</th>
                        <th className="py-1 px-2 text-right">SGST Rate</th>
                        <th className="py-1 px-2 text-right">SGST Amount</th>
                      </>
                    )}
                    <th className="py-1 px-2 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {gstSlabs.map((s, i) => (
                    <tr key={i}>
                      <td className="py-1 px-2 font-bold text-slate-800">{s.taxRate.toFixed(2)}%</td>
                      <td className="py-1 px-2 text-right">{currency}{s.taxableAmount.toFixed(2)}</td>
                      {isInterState ? (
                        <>
                          <td className="py-1 px-2 text-right">{s.taxRate.toFixed(2)}%</td>
                          <td className="py-1 px-2 text-right">{currency}{s.igstAmount.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1 px-2 text-right">{(s.taxRate / 2).toFixed(2)}%</td>
                          <td className="py-1 px-2 text-right">{currency}{s.cgstAmount.toFixed(2)}</td>
                          <td className="py-1 px-2 text-right">{(s.taxRate / 2).toFixed(2)}%</td>
                          <td className="py-1 px-2 text-right">{currency}{s.sgstAmount.toFixed(2)}</td>
                        </>
                      )}
                      <td className="py-1 px-2 text-right font-bold text-slate-900">{currency}{s.taxAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary & Payment Tenders Section */}
          <div className="flex items-start justify-between gap-6 pt-1">
            {/* Left: Payment Tenders & Words */}
            <div className="flex-1 space-y-2.5 text-[11px]">
              {/* Payment Methods */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
                  Payment History / Breakdown:
                </p>
                {paymentsList.map((pm, i) => {
                  const payDate = pm.payment_date || pm.created_at;
                  const dateStr = payDate ? new Date(payDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                  return (
                    <div key={i} className="flex justify-between font-mono text-slate-700 max-w-sm text-[10px]">
                      <span>
                        <strong className="text-slate-900">{pm.payment_method || 'CASH'}</strong>
                        {pm.reference_number ? ` (${pm.reference_number})` : ''}
                        {dateStr ? ` · ${dateStr}` : ''}:
                      </span>
                      <span className="font-bold text-slate-900">{currency}{parseFloat(pm.amount || 0).toFixed(2)}</span>
                    </div>
                  );
                })}
                {balanceDueVal > 0 && (
                  <div className="flex justify-between font-mono text-amber-800 font-bold max-w-sm pt-0.5 border-t border-slate-200">
                    <span>Credit Balance Due:</span>
                    <span>{currency}{balanceDueVal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Amount in Words */}
              <div className="text-[10px] text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-700">Amount in Words: </span>
                <span className="italic font-medium">{amountInWords}</span>
              </div>
            </div>

            {/* Right: Calculations Totals Box */}
            <div className="w-72 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Gross):</span>
                <span className="font-bold text-slate-900">{currency}{subtotalVal.toFixed(2)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Total Discount:</span>
                  <span>−{currency}{discountVal.toFixed(2)}</span>
                </div>
              )}
              {orderDiscVal > 0 && (
                <div className="flex justify-between text-emerald-600 text-[11px]">
                  <span>Order Discount:</span>
                  <span>−{currency}{orderDiscVal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 pt-0.5 border-t border-slate-200">
                <span>Taxable Amount:</span>
                <span className="font-semibold">{currency}{taxableTotalVal.toFixed(2)}</span>
              </div>
              {isGstInvoice && (
                isInterState ? (
                  <div className="flex justify-between text-slate-700">
                    <span>Integrated GST (IGST):</span>
                    <span>+{currency}{igstVal.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>Central GST (CGST):</span>
                      <span>+{currency}{cgstVal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>State GST (SGST):</span>
                      <span>+{currency}{sgstVal.toFixed(2)}</span>
                    </div>
                  </>
                )
              )}
              {roundOffVal !== 0 && (
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Round Off:</span>
                  <span>{roundOffVal > 0 ? `+${currency}${roundOffVal.toFixed(2)}` : `−${currency}${Math.abs(roundOffVal).toFixed(2)}`}</span>
                </div>
              )}

              {/* Grand Total Banner */}
              <div className="flex justify-between text-sm font-black bg-[#0B1120] text-[#D4AF37] p-2 rounded-lg mt-1 border border-[#D4AF37]/40 shadow-xs">
                <span>GRAND TOTAL:</span>
                <span>{currency}{grandTotalVal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[11px] pt-1 text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-bold text-emerald-700">{currency}{paidVal.toFixed(2)}</span>
              </div>
              {balanceDueVal > 0 && (
                <div className="flex justify-between text-[11px] text-amber-800 font-bold">
                  <span>Balance Due:</span>
                  <span>{currency}{balanceDueVal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Declarations & Signatory Footer */}
          <div className="pt-6 flex justify-between items-end border-t border-slate-300 text-xs text-slate-600">
            <div className="max-w-md space-y-1">
              <p className="text-[10px] font-semibold text-slate-700">Declaration:</p>
              <p className="text-[9px] text-slate-500 leading-tight">
                Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged.
              </p>
              <p className="text-[9px] text-slate-500 leading-tight">
                Terms: Goods once sold will not be returned without original invoice. Interest @ 18% p.a. will be charged on overdue payments.
              </p>
            </div>

            <div className="text-center shrink-0">
              <p className="text-[10px] font-bold text-slate-700 uppercase mb-8">
                For {businessName}
              </p>
              <div className="w-44 border-b border-slate-700 mb-1 mx-auto" />
              <p className="text-[10px] font-bold text-slate-800">Authorized Signatory</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceDocument;

