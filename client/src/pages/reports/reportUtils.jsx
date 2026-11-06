import React from 'react';
import { Download, Printer, FileText, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react';

/**
 * Clean CSV / Excel export with UTF-8 BOM and formula injection prevention
 */
export function exportTableToCsv(filename, headers, rows) {
  const sanitize = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Prevent Excel formula injection
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = [
    headers.map(sanitize).join(','),
    ...rows.map((row) => row.map(sanitize).join(','))
  ];

  // \uFEFF enables Microsoft Excel to recognize UTF-8 encoding (including ₹ symbol)
  const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Print & Save-as-PDF handler
 */
export function printReport(reportTitle, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    window.print();
    return;
  }

  const existingStyle = document.getElementById('report-print-style');
  if (existingStyle) existingStyle.remove();

  const style = document.createElement('style');
  style.id = 'report-print-style';
  style.innerHTML = `
    @media print {
      body * {
        visibility: hidden !important;
      }
      #${containerId}, #${containerId} * {
        visibility: visible !important;
      }
      #${containerId} {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 10px !important;
        background: #ffffff !important;
      }
      .no-print, button, input, select {
        display: none !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 11px !important;
      }
      th, td {
        border: 1px solid #cbd5e1 !important;
        padding: 6px 8px !important;
      }
      thead th {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
      }
    }
  `;
  document.head.appendChild(style);

  const cleanup = () => {
    style.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    window.print();
  }, 100);
}

/**
 * Reusable Report Action Bar with Search, Excel, PDF, and Print
 */
export function ReportActionBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records...',
  onRefresh,
  onExportExcel,
  onPrint,
  extraFilters,
  children
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs no-print">
      {/* Search and Extra Filters */}
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px] flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white text-slate-800"
          />
        </div>
        {extraFilters}
      </div>

      {/* Action Buttons: Excel, PDF, Print, Refresh */}
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Report Data"
            className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel / CSV</span>
          </button>
        )}
        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-subtle cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print / PDF</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Reusable Pagination Controls
 */
export function ReportPagination({
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 15,
  onPageChange
}) {
  const start = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(totalRecords, currentPage * pageSize);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-500 rounded-b-xl no-print">
      <div>
        Showing <span className="font-semibold text-slate-800">{start}</span> to{' '}
        <span className="font-semibold text-slate-800">{end}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalRecords}</span> records
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>
        <span className="px-2 text-slate-700 font-semibold">
          {currentPage} / {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Reusable Stat KPI Pill
 */
export function ReportStatPill({ label, value, subtext, color = 'bg-slate-50 text-slate-800' }) {
  return (
    <div className={`px-4 py-3 rounded-xl border border-slate-200/80 bg-white shadow-xs flex-1 min-w-[160px]`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      {subtext && <p className="text-[11px] text-slate-500 mt-0.5">{subtext}</p>}
    </div>
  );
}

