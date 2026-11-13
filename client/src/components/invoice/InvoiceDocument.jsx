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

  const parsedDueDate = invoice.due_date ? new Date(invoice.due_date) : null;
  const formattedDueDate = parsedDueDate && !isNaN(parsedDueDate.getTime())
    ? parsedDueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : formattedDate;

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

  // GST & Supply Classification & Offline Status
  const isOffline = Boolean(invoice.is_offline || invoice.status === 'PENDING_SYNC' || (invoice.provisional_number && !invoice.server_invoice_number && !invoice.id));
  const isGstInvoice = taxTotalVal > 0 || (invoice.items || []).some(it => parseFloat(it.tax_rate || 0) > 0);
  const invoiceTypeTitle = isOffline
    ? 'PROVISIONAL OFFLINE BILL'
    : (isGstInvoice ? 'TAX INVOICE' : 'BILL OF SUPPLY');

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

    const hsn = it.hsn_code || it.product_hsn || it.hsn || it.product?.hsn || it.product?.hsn_code || it.sku || it.product_sku || '';

    return {
      index: idx + 1,
      name: it.product_name || 'Product Item',
      sku: it.product_sku || '',
      hsn: hsn,
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
      : paymentStatus === 'PENDING_CONFIRMATION'
      ? 'PENDING CONFIRMATION'
      : 'UNPAID / ON CREDIT';

  const amountInWords = numberToWords(grandTotalVal);

  // Dynamic Density Calculation based on item count for strict 1-page A4 fitting
  const count = items.length;
  const density =
    count <= 6
      ? 'standard'
      : count <= 15
      ? 'compact'
      : count <= 30
      ? 'dense'
      : count <= 55
      ? 'ultra-dense'
      : 'micro-dense';

  const a4ContainerPad =
    density === 'micro-dense'
      ? 'p-1.5'
      : density === 'ultra-dense'
      ? 'p-2'
      : density === 'dense'
      ? 'p-2.5'
      : density === 'compact'
      ? 'p-3'
      : 'p-3.5 sm:p-4';

  const a4Spacing =
    density === 'micro-dense'
      ? 'space-y-1'
      : density === 'ultra-dense'
      ? 'space-y-1'
      : density === 'dense'
      ? 'space-y-1.5'
      : density === 'compact'
      ? 'space-y-1.5'
      : 'space-y-2';

  // Dynamic Thermal Density Calculation based on item count for zero overflow
  const thermalItemCount = items.length;
  const thermalDensity =
    thermalItemCount <= 5
      ? 'standard'
      : thermalItemCount <= 10
      ? 'compact'
      : thermalItemCount <= 15
      ? 'dense'
      : 'ultra-dense';

  const thermalContainerPad =
    thermalDensity === 'ultra-dense'
      ? 'p-1.5'
      : thermalDensity === 'dense'
      ? 'p-2'
      : thermalDensity === 'compact'
      ? 'p-2'
      : 'p-2 sm:p-2.5';

  const thermalSpacing =
    thermalDensity === 'ultra-dense'
      ? 'space-y-0.5'
      : thermalDensity === 'dense'
      ? 'space-y-0.75'
      : thermalDensity === 'compact'
      ? 'space-y-0.75'
      : 'space-y-1';

  const thermalHeadSize =
    thermalDensity === 'ultra-dense' || thermalDensity === 'dense'
      ? 'text-xs'
      : 'text-[13px]';

  const thermalMetaSize =
    thermalDensity === 'ultra-dense'
      ? 'text-[8px]'
      : thermalDensity === 'dense'
      ? 'text-[8.5px]'
      : 'text-[9px]';

  const thermalItemRowPad =
    thermalDensity === 'ultra-dense'
      ? 'py-0.2'
      : thermalDensity === 'dense'
      ? 'py-0.35'
      : 'py-0.5';

  const thermalItemTitleSize =
    thermalDensity === 'ultra-dense'
      ? 'text-[8.5px]'
      : thermalDensity === 'dense'
      ? 'text-[9px]'
      : 'text-[9.5px]';

  const thermalItemDetailSize =
    thermalDensity === 'ultra-dense'
      ? 'text-[7.5px]'
      : thermalDensity === 'dense'
      ? 'text-[8px]'
      : 'text-[8.5px]';

  return (
    <div
      id="invoice-print-area"
      className={`${printLayout === 'thermal' ? 'print-thermal' : 'print-a4'} bg-white ${
        printLayout === 'thermal'
          ? `w-[72mm] max-w-[72mm] ${thermalContainerPad} shadow-sm border border-slate-200 font-mono text-slate-900 select-text box-border`
          : 'w-full max-w-[800px] p-2 bg-white text-black select-text shadow-none border-0'
      }`}
    >
      {/* =========================================================================
          FORMAT 1: 80mm THERMAL RECEIPT (CONTINUOUS ROLL PRINTING)
      ========================================================================= */}
      {printLayout === 'thermal' ? (
        <div className={thermalSpacing}>
          {/* Business & Header */}
          <div className="text-center pb-0.75 border-b border-dashed border-slate-400">
            <h2 className={`${thermalHeadSize} font-extrabold uppercase tracking-wider text-slate-950 leading-tight`}>
              {businessName}
            </h2>
            <p className="text-[9px] text-slate-600 leading-tight mt-0.5">{businessAddress}</p>
            {businessPhone && (
              <p className="text-[9px] text-slate-600 leading-tight">Ph: {businessPhone}</p>
            )}
            {isOffline && (
              <div className="mt-0.5 inline-block border-y border-dashed border-slate-700 py-0.2 px-1.5">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-950">
                  *** PROVISIONAL OFFLINE BILL ***
                </span>
              </div>
            )}
          </div>

          {/* Invoice Meta */}
          <div className={`py-0.75 border-b border-dashed border-slate-400 space-y-0.2 ${thermalMetaSize} leading-tight`}>
            {isOffline && (
              <div className="mb-0.5 p-0.5 bg-amber-50 border border-dashed border-amber-400 text-amber-900 text-center text-[8px] font-bold">
                * PROVISIONAL OFFLINE BILL — PENDING SYNC *
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">{isOffline ? 'Provisional Ref:' : 'Invoice No:'}</span>
              <span className="font-bold font-mono text-slate-900">{isOffline ? (invoice.provisional_number || invoiceNumber) : invoiceNumber}</span>
            </div>
            {invoice.provisional_number && !isOffline && (
              <div className="flex justify-between text-[8px] text-slate-500">
                <span>(Offline Ref):</span>
                <span className="font-mono">{invoice.provisional_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Date & Time:</span>
              <span>{formattedDate} {formattedTime}</span>
            </div>
          </div>

          {/* Line Items Table (Continuous, Never Truncated) */}
          <div className="py-0.75 border-b border-dashed border-slate-400">
            <div className="flex justify-between font-bold border-b border-slate-900 pb-0.5 text-[9px] uppercase tracking-tight">
              <span className="w-6/12">Item / Unit</span>
              <span className="w-3/12 text-right">Qty x Rate</span>
              <span className="w-3/12 text-right">Total</span>
            </div>

            <div className="divide-y divide-dotted divide-slate-200 py-0.5">
              {items.map((it) => (
                <div key={it.index} className={thermalItemRowPad}>
                  <div className="flex justify-between items-start gap-1">
                    <span className={`font-bold text-slate-900 leading-tight w-7/12 break-words pr-0.5 ${thermalItemTitleSize}`}>
                      {it.name}
                    </span>
                    <span className={`font-mono text-right w-5/12 font-bold text-slate-900 shrink-0 ${thermalItemTitleSize}`}>
                      {currency}{it.lineTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className={`flex justify-between text-slate-600 mt-0.2 ${thermalItemDetailSize} leading-tight`}>
                    <span className="break-words">
                      {it.sku && `[${it.sku}]`}
                      {it.batch && ` B:${it.batch}`}
                      {it.expiry && ` E:${it.expiry}`}
                      {it.freeQuantity > 0 && ` (+${it.freeQuantity} Free)`}
                    </span>
                    <span className="shrink-0 text-right">
                      {it.quantity} {it.unit} @ {currency}{it.unitPrice.toFixed(2)}
                    </span>
                  </div>
                  {Boolean(it.discountAmount > 0 || it.taxRate > 0) && (
                    <div className={`flex justify-between text-slate-500 ${thermalItemDetailSize} leading-tight`}>
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
          <div className={`py-0.75 border-b border-dashed border-slate-400 space-y-0.2 ${thermalMetaSize} leading-tight`}>
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
              <div className="flex justify-between text-slate-500 text-[8px]">
                <span>Round Off:</span>
                <span className="font-mono">{roundOffVal > 0 ? `+${roundOffVal.toFixed(2)}` : roundOffVal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-black pt-0.75 border-t-2 border-slate-900 text-slate-950">
              <span className="tracking-wide">GRAND TOTAL:</span>
              <span className="font-mono text-sm">{currency}{grandTotalVal.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment & Ledger Details */}
          <div className={`py-0.75 border-b border-dashed border-slate-400 space-y-0.2 ${thermalMetaSize} leading-tight`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700 uppercase">Payment Status:</span>
              <span className={`font-bold px-1.5 py-0.2 rounded text-[8px] ${
                paymentStatus === 'PAID'
                  ? 'bg-emerald-100 text-emerald-800'
                  : (paymentStatus === 'PARTIALLY_PAID' || paymentStatus === 'PENDING_CONFIRMATION')
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>
                {paymentStatusLabel}
              </span>
            </div>
            {paymentsList.map((pm, i) => (
              <div key={i} className="flex justify-between text-slate-700">
                <span>
                  {(pm.payment_method || pm.method || 'CASH')}
                  {pm.reference_number ? ` (Ref:${pm.reference_number})` : ''}
                  {pm.status === 'PENDING_CONFIRMATION' ? ' [Pending]' : ''}:
                </span>
                <span className="font-mono font-semibold">{currency}{parseFloat(pm.amount || 0).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-0.5 border-t border-dotted border-slate-300">
              <span>Paid Amount:</span>
              <span className="font-mono">{currency}{paidVal.toFixed(2)}</span>
            </div>
            {balanceDueVal > 0 && (
              <div className="flex justify-between font-bold text-amber-900 bg-amber-50 px-1 py-0.2 rounded">
                <span>Balance Due (Credit):</span>
                <span className="font-mono">{currency}{balanceDueVal.toFixed(2)}</span>
              </div>
            )}
            {customerLedgerBalance > 0 && (
              <div className="flex justify-between text-[8px] text-slate-600 pt-0.2">
                <span>Total Customer Outstanding:</span>
                <span className="font-mono font-semibold">{currency}{customerLedgerBalance.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center pt-0.75 text-[8.5px] text-slate-500 space-y-0.2 leading-tight">
            <p className="font-mono">Items: {items.length} | Total Qty: {totalQuantitySum}{totalFreeQuantitySum > 0 ? ` (+${totalFreeQuantitySum} Free)` : ''}</p>
            <p className="font-semibold text-slate-700">Thank you for your business!</p>
            <p className="text-[8px]">Goods once sold returnable only with original receipt.</p>
            <p className="text-[7.5px] text-slate-400">Computer Generated Wholesale Invoice</p>
          </div>
        </div>
      ) : (
        /* =========================================================================
            FORMAT 2: A4 TAX INVOICE (PROFESSIONAL WHOLESALE FMCG GST FORMAT)
        ========================================================================= */
        <div className={`font-sans text-black bg-white border border-black ${
          density === 'micro-dense'
            ? 'text-[6.5px] leading-[1.1]'
            : density === 'ultra-dense'
            ? 'text-[7.5px] leading-tight'
            : density === 'dense'
            ? 'text-[8.5px] leading-snug'
            : density === 'compact'
            ? 'text-[9.5px] leading-snug'
            : 'text-[10px] leading-normal'
        }`}>
          {/* =========================================================================
              1. TOP HEADER BAR: Page Number | TAX INVOICE | Original Copy
          ========================================================================= */}
          <div className="flex justify-between items-center px-2 py-0.5 border-b border-black font-bold uppercase tracking-wider text-[0.9em]">
            <span>Page 1 of 1</span>
            <span className="text-[1.25em] font-extrabold tracking-widest">{invoiceTypeTitle}</span>
            <span>Original Copy</span>
          </div>

          {/* =========================================================================
              2. COMPANY DETAILS (Name, Address, Mobile, GSTIN)
          ========================================================================= */}
          <div className="text-center px-3 py-1.5 border-b border-black">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black leading-tight">
              {businessName}
            </h1>
            <p className="text-[0.9em] text-black mt-0.5 max-w-xl mx-auto leading-tight">
              {businessAddress}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-0.5 text-[0.9em] mt-0.5">
              {businessPhone && (
                <span>Mobile: <strong className="font-mono">{businessPhone}</strong></span>
              )}
              {businessEmail && (
                <span>Email: <strong className="font-sans">{businessEmail}</strong></span>
              )}
              {businessGstin && (
                <span>GSTIN: <strong className="font-mono">{businessGstin}</strong></span>
              )}
            </div>
          </div>

          {/* =========================================================================
              3. BILLING DETAILS (LEFT) & INVOICE DETAILS (RIGHT)
          ========================================================================= */}
          <div className="grid grid-cols-2 border-b border-black">
            {/* Left Column: Billing Details */}
            <div className="p-1.5 border-r border-black space-y-0.5 text-[0.9em]">
              <div className="flex justify-between items-center border-b border-black/40 pb-0.5">
                <span className="font-bold uppercase tracking-wider underline">Billing Details:</span>
                <span className="font-bold uppercase text-[0.85em] border border-black px-1 rounded-xs">
                  {customerTypeLabel}
                </span>
              </div>
              <div className="font-bold text-[1.1em] text-black pt-0.5 leading-tight">
                {customerName}
              </div>
              {customerAddress && (
                <div className="text-black leading-tight">{customerAddress}</div>
              )}
              <div className="text-black">
                Mobile: <strong className="font-mono">{customerPhone || '—'}</strong>
              </div>
              <div className="text-black">
                GSTIN: <strong className="font-mono">{customerGstin || 'Unregistered (URP)'}</strong>
              </div>
              <div className="text-black">
                State: <strong className="font-sans">{customerState || businessState || 'Tamil Nadu'}</strong>
              </div>
            </div>

            {/* Right Column: Invoice Details */}
            <div className="p-1.5 space-y-0.5 text-[0.9em]">
              <div className="space-y-0.5 text-[1em] leading-tight font-mono">
                <div className="flex justify-between items-center py-0.2">
                  <span className="font-semibold text-black font-sans">Invoice Number:</span>
                  <span className="font-bold text-black">
                    {isOffline ? (invoice.provisional_number || invoiceNumber) : invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.2">
                  <span className="font-semibold text-black font-sans">Invoice Date:</span>
                  <span className="text-black">{formattedDate}</span>
                </div>
                <div className="flex justify-between items-center py-0.2">
                  <span className="font-semibold text-black font-sans">Due Date:</span>
                  <span className="text-black">{invoice.due_date ? formattedDueDate : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.2">
                  <span className="font-semibold text-black font-sans">Place of Supply:</span>
                  <span className="text-black font-sans font-semibold">
                    {customerState || businessState || 'Tamil Nadu'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.2">
                  <span className="font-semibold text-black font-sans">Reverse Charge:</span>
                  <span className="text-black font-sans">No</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-0.5 border-t border-dotted border-black/40 text-[0.85em]">
                <span>Status: <strong className="font-bold uppercase font-sans">{paymentStatusLabel}</strong></span>
                {balanceDueVal > 0 && (
                  <span>Balance Due on Bill: <strong className="font-mono font-bold">{currency}{balanceDueVal.toFixed(2)}</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              4. PRODUCT DETAILS TABLE (Sr. No., Item Description, HSN/SAC, Qty, Unit, List Price, Discount, Tax %, Amount)
          ========================================================================= */}
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-black font-bold text-center text-[0.9em] bg-white">
                <th className="py-1 px-1 border-r border-black w-10">Sr. No.</th>
                <th className="py-1 px-1.5 border-r border-black text-left">Item Description</th>
                <th className="py-1 px-1 border-r border-black w-16">HSN/SAC</th>
                <th className="py-1 px-1 border-r border-black w-12">Qty</th>
                <th className="py-1 px-1 border-r border-black w-12">Unit</th>
                <th className="py-1 px-1 border-r border-black w-16 text-right">List Price</th>
                <th className="py-1 px-1 border-r border-black w-16 text-right">Discount</th>
                <th className="py-1 px-1 border-r border-black w-12 text-center">Tax %</th>
                <th className="py-1 px-1.5 text-right w-20">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr
                  key={it.index}
                  className="border-b border-black/20 hover:bg-slate-50 text-[0.9em]"
                >
                  <td className="py-0.5 px-1 text-center font-mono border-r border-black">
                    {it.index}
                  </td>
                  <td className="py-0.5 px-1.5 text-left font-medium border-r border-black break-words">
                    <span className="font-bold text-black">{it.name}</span>
                    {Boolean(it.sku || it.batch || it.expiry) && (
                      <span className="block text-[0.85em] text-black/70">
                        {it.sku && `[${it.sku}] `}
                        {it.batch && `B:${it.batch} `}
                        {it.expiry && `Exp:${it.expiry}`}
                      </span>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-center font-mono text-black border-r border-black">
                    {it.hsn || '—'}
                  </td>
                  <td className="py-0.5 px-1 text-center font-bold font-mono text-black border-r border-black">
                    {it.quantity}
                    {it.freeQuantity > 0 && (
                      <span className="block text-[0.85em] font-semibold text-emerald-700">+{it.freeQuantity}</span>
                    )}
                  </td>
                  <td className="py-0.5 px-1 text-center font-semibold text-black border-r border-black">
                    {it.unit}
                  </td>
                  <td className="py-0.5 px-1 text-right font-mono text-black border-r border-black">
                    {it.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-0.5 px-1 text-right font-mono text-black border-r border-black">
                    {it.discountAmount > 0 ? it.discountAmount.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-0.5 px-1 text-center font-mono text-black border-r border-black">
                    {it.taxRate}%
                  </td>
                  <td className="py-0.5 px-1.5 text-right font-mono font-bold text-black">
                    {it.lineTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-b border-black font-bold text-[0.9em] bg-white">
                <td colSpan="3" className="py-1 px-1.5 text-right uppercase border-r border-black">
                  Total:
                </td>
                <td className="py-1 px-1 text-center font-mono border-r border-black">
                  {totalQuantitySum}
                  {totalFreeQuantitySum > 0 && (
                    <span className="block text-[0.85em] text-emerald-700">+{totalFreeQuantitySum}</span>
                  )}
                </td>
                <td className="py-1 px-1 border-r border-black"></td>
                <td className="py-1 px-1 text-right font-mono border-r border-black">
                  {currency}{subtotalVal.toFixed(2)}
                </td>
                <td className="py-1 px-1 text-right font-mono border-r border-black">
                  {discountVal > 0 ? `−${currency}${discountVal.toFixed(2)}` : '0.00'}
                </td>
                <td className="py-1 px-1 border-r border-black"></td>
                <td className="py-1 px-1.5 text-right font-mono text-black">
                  {currency}{grandTotalVal.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* =========================================================================
              5. BOTTOM SECTION: TAX BREAKDOWN, WORDS, PAYMENTS & TERMS (LEFT) | TOTALS (RIGHT)
          ========================================================================= */}
          <div className="grid grid-cols-12 border-b border-black">
            {/* Left Column (7/12): Tax Breakdown + Words + Payment Details + Terms */}
            <div className="col-span-7 border-r border-black flex flex-col justify-between text-[0.88em]">
              {/* GST Tax Breakdown */}
              {isGstInvoice && gstSlabs.length > 0 && (
                <div className="border-b border-black">
                  <div className="px-1.5 py-0.5 font-bold uppercase tracking-wider text-[0.9em] border-b border-black bg-white flex justify-between items-center">
                    <span>GST Tax Breakdown</span>
                    <span className="text-[0.85em] font-normal">Rate-wise CGST, SGST & IGST Distribution</span>
                  </div>
                  <table className="w-full text-left table-fixed border-collapse text-[0.9em]">
                    <thead>
                      <tr className="border-b border-black/40 font-bold bg-white">
                        <th className="py-0.5 px-1 border-r border-black/40">Tax Slab</th>
                        <th className="py-0.5 px-1 text-right border-r border-black/40">Taxable Val ({currency})</th>
                        {isInterState ? (
                          <>
                            <th className="py-0.5 px-1 text-right border-r border-black/40">IGST %</th>
                            <th className="py-0.5 px-1 text-right border-r border-black/40">IGST Amt ({currency})</th>
                          </>
                        ) : (
                          <>
                            <th className="py-0.5 px-1 text-right border-r border-black/40">CGST %</th>
                            <th className="py-0.5 px-1 text-right border-r border-black/40">CGST Amt ({currency})</th>
                            <th className="py-0.5 px-1 text-right border-r border-black/40">SGST %</th>
                            <th className="py-0.5 px-1 text-right border-r border-black/40">SGST Amt ({currency})</th>
                          </>
                        )}
                        <th className="py-0.5 px-1 text-right font-bold">Total Tax ({currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/20 font-mono">
                      {gstSlabs.map((s, i) => (
                        <tr key={i}>
                          <td className="py-0.5 px-1 font-bold border-r border-black/30">{s.taxRate.toFixed(2)}%</td>
                          <td className="py-0.5 px-1 text-right border-r border-black/30">{s.taxableAmount.toFixed(2)}</td>
                          {isInterState ? (
                            <>
                              <td className="py-0.5 px-1 text-right border-r border-black/30">{s.taxRate.toFixed(2)}%</td>
                              <td className="py-0.5 px-1 text-right border-r border-black/30">{s.igstAmount.toFixed(2)}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-0.5 px-1 text-right border-r border-black/30">{(s.taxRate / 2).toFixed(2)}%</td>
                              <td className="py-0.5 px-1 text-right border-r border-black/30">{s.cgstAmount.toFixed(2)}</td>
                              <td className="py-0.5 px-1 text-right border-r border-black/30">{(s.taxRate / 2).toFixed(2)}%</td>
                              <td className="py-0.5 px-1 text-right border-r border-black/30">{s.sgstAmount.toFixed(2)}</td>
                            </>
                          )}
                          <td className="py-0.5 px-1 text-right font-bold">{s.taxAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Amount in Words */}
              <div className="p-1 border-b border-black text-[0.9em] leading-tight">
                <span className="font-bold">Amount in Words: </span>
                <span className="italic font-medium">{amountInWords}</span>
              </div>

              {/* Payment Details */}
              <div className="p-1 border-b border-black text-[0.9em] leading-tight space-y-0.5">
                <span className="font-bold uppercase tracking-wider block text-[0.85em]">
                  Payment Details:
                </span>
                {paymentsList.map((pm, i) => {
                  const payDate = pm.payment_date || pm.created_at;
                  const dateStr = payDate ? new Date(payDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                  return (
                    <div key={i} className="flex justify-between font-mono text-[0.95em]">
                      <span>
                        <strong>{pm.payment_method || pm.method || 'CASH'}</strong>
                        {pm.reference_number ? ` (Ref: ${pm.reference_number})` : ''}
                        {pm.status === 'PENDING_CONFIRMATION' ? ' [Pending]' : ''}
                        {dateStr ? ` · ${dateStr}` : ''}:
                      </span>
                      <strong className="font-bold">{currency}{parseFloat(pm.amount || 0).toFixed(2)}</strong>
                    </div>
                  );
                })}
              </div>

              {/* Terms and Conditions */}
              <div className="p-1 text-[0.82em] leading-tight space-y-0.2">
                <p className="font-bold uppercase tracking-wider text-[0.85em]">Terms and Conditions:</p>
                <p>1. Goods once sold will not be accepted back or exchanged without original invoice.</p>
                <p>2. Interest @ 18% p.a. will be charged on overdue payments beyond agreed credit period.</p>
                <p>3. Any discrepancy or damage must be notified within 24 hours of receipt of goods.</p>
                <p>4. All disputes are subject to local jurisdiction only.</p>
              </div>
            </div>

            {/* Right Column (5/12): Financial Summary Totals & NET AMOUNT */}
            <div className="col-span-5 p-1.5 space-y-0.5 font-mono text-[0.9em] flex flex-col justify-between">
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="font-sans">Subtotal (Gross):</span>
                  <strong>{currency}{subtotalVal.toFixed(2)}</strong>
                </div>

                {discountVal > 0 && (
                  <div className="flex justify-between text-black">
                    <span className="font-sans">Total Discount:</span>
                    <span>−{currency}{discountVal.toFixed(2)}</span>
                  </div>
                )}

                {orderDiscVal > 0 && (
                  <div className="flex justify-between">
                    <span className="font-sans">Order Discount:</span>
                    <span>−{currency}{orderDiscVal.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between pt-0.5 border-t border-black/30">
                  <span className="font-sans font-semibold">Taxable Amount:</span>
                  <strong>{currency}{taxableTotalVal.toFixed(2)}</strong>
                </div>

                {isGstInvoice && (
                  isInterState ? (
                    <div className="flex justify-between">
                      <span className="font-sans">Integrated GST (IGST):</span>
                      <span>+{currency}{igstVal.toFixed(2)}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="font-sans">Central GST (CGST):</span>
                        <span>+{currency}{cgstVal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans">State GST (SGST):</span>
                        <span>+{currency}{sgstVal.toFixed(2)}</span>
                      </div>
                    </>
                  )
                )}

                {roundOffVal !== 0 && (
                  <div className="flex justify-between">
                    <span className="font-sans">Round Off:</span>
                    <span>{roundOffVal > 0 ? `+${currency}${roundOffVal.toFixed(2)}` : `−${currency}${Math.abs(roundOffVal).toFixed(2)}`}</span>
                  </div>
                )}
              </div>

              {/* NET AMOUNT (Grand Total) - High prominence border box */}
              <div className="pt-1 mt-1 border-t-2 border-b-2 border-black">
                <div className="flex justify-between items-center py-1 font-extrabold text-[1.15em]">
                  <span className="font-sans uppercase">NET AMOUNT:</span>
                  <span className="font-mono">{currency}{grandTotalVal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-0.2 pt-0.5">
                <div className="flex justify-between">
                  <span className="font-sans font-semibold">Paid Amount:</span>
                  <strong>{currency}{paidVal.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans font-semibold">Balance Due:</span>
                  <strong className={balanceDueVal > 0 ? 'underline' : ''}>
                    {currency}{balanceDueVal.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              6. FOOTER & AUTHORIZED SIGNATURES
          ========================================================================= */}
          <div className="p-2 flex flex-row justify-between items-end text-[0.88em]">
            <div className="space-y-4 max-w-sm">
              <p className="leading-tight">
                Customer Acknowledgment: Received the above mentioned goods in good condition & order.
              </p>
              <div>
                <div className="w-36 border-b border-black mb-0.5" />
                <p className="font-bold uppercase text-[0.95em]">Receiver's Signature & Seal</p>
              </div>
            </div>

            <div className="text-right space-y-4">
              <p className="font-bold uppercase">
                For {businessName}
              </p>
              <div>
                <div className="w-40 border-b-2 border-black mb-0.5 ml-auto" />
                <p className="font-bold uppercase text-[0.95em]">Authorized Signatory</p>
                <p className="text-[0.8em] text-black/60 mt-0.2">Computer Generated Wholesale Invoice</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceDocument;

