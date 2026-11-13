/**
 * BUSINESSFLOW Invoice Print Utilities
 * Dedicated direct print engine ensuring strictly 1-page A4 fitting and continuous thermal roll printing.
 */

export function executeDirectPrint(elementId = 'sales-invoice-print-area', isThermal = false) {
  const invoiceEl = document.getElementById(elementId) || document.getElementById('invoice-print-area');
  if (!invoiceEl) return;

  // 1. Clean up any previous direct print container
  let directContainer = document.getElementById('invoice-print-direct-container');
  if (directContainer) {
    directContainer.remove();
  }

  // 2. Create dedicated direct print container mounted directly on document.body
  directContainer = document.createElement('div');
  directContainer.id = 'invoice-print-direct-container';

  // Clone the invoice document node
  const cloned = invoiceEl.cloneNode(true);

  // If A4 print: ensure single-page fitting with auto-scale safety if needed
  if (!isThermal) {
    // 275mm printable height at 96 DPI is ~1000px
    const maxA4HeightPx = 990;
    const naturalHeight = invoiceEl.scrollHeight || invoiceEl.offsetHeight;
    if (naturalHeight > maxA4HeightPx) {
      const scaleFactor = Math.max(0.55, (maxA4HeightPx / naturalHeight) * 0.98);
      cloned.style.transform = `scale(${scaleFactor.toFixed(3)})`;
      cloned.style.transformOrigin = 'top center';
      cloned.style.width = `${(100 / scaleFactor).toFixed(2)}%`;
      cloned.style.marginBottom = `-${((1 - scaleFactor) * naturalHeight).toFixed(0)}px`;
    }
  }

  directContainer.appendChild(cloned);
  document.body.appendChild(directContainer);

  // 3. Inject print styles with dynamic @page sizing and strict isolation
  let style = document.getElementById('print-page-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'print-page-style';
    document.head.appendChild(style);
  }

  // Automatically calculate the required receipt height based on its actual content
  let pageRule = '';
  if (isThermal) {
    const naturalHeightPx = invoiceEl.scrollHeight || invoiceEl.offsetHeight || 380;
    // 1px at 96 DPI = 25.4 / 96 = 0.264583 mm
    // Add 8mm bottom safety margin for tear-off/cutter
    const calculatedHeightMm = Math.max(90, Math.ceil(naturalHeightPx * (25.4 / 96)) + 8);
    pageRule = `@page { size: 80mm ${calculatedHeightMm}mm; margin: 0; }`;
  } else {
    pageRule = '@page { size: A4 portrait; margin: 5mm; }';
  }

  style.innerHTML = `
    ${pageRule}

    @media screen {
      #invoice-print-direct-container {
        display: none !important;
      }
    }

    @media print {
      html, body {
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      body > *:not(#invoice-print-direct-container) {
        display: none !important;
      }

      #invoice-print-direct-container {
        display: block !important;
        position: static !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: ${isThermal ? '72mm' : '100%'} !important;
        max-width: ${isThermal ? '72mm' : '200mm'} !important;
        box-sizing: border-box !important;
        ${!isThermal ? 'height: auto !important; max-height: 275mm !important; page-break-after: avoid !important; break-after: avoid !important; page-break-inside: avoid !important; break-inside: avoid !important;' : 'height: auto !important; min-height: 0 !important; overflow: visible !important;'}
      }

      #invoice-print-direct-container #${elementId},
      #invoice-print-direct-container #sales-invoice-print-area,
      #invoice-print-direct-container #sales-invoice-direct-print-area,
      #invoice-print-direct-container #invoice-print-area {
        display: block !important;
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: #ffffff !important;
      }

      #invoice-print-direct-container table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
      }

      .print-thermal {
        width: 72mm !important;
        max-width: 72mm !important;
        margin: 0 auto !important;
        padding: 1mm 0 !important;
        height: auto !important;
        overflow: visible !important;
        box-sizing: border-box !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
      }

      .print-a4 {
        width: 100% !important;
        max-width: 200mm !important;
        height: auto !important;
        max-height: 275mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        color: #000000 !important;
        background: #ffffff !important;
        box-sizing: border-box !important;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
        break-after: avoid !important;
        break-inside: avoid !important;
      }

      .print-a4 * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
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
}

