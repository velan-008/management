import React, { useState, useEffect, useCallback } from 'react';
import { productService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function StockMovementReportTab({ currency = '₹' }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search
      };
      if (typeFilter !== 'ALL') params.type = typeFilter;
      const res = await productService.allMovements(params);
      const rows = res.data?.movements || [];
      setMovements(rows);
      setPagination({
        total: res.meta?.total || rows.length,
        totalPages: res.meta?.totalPages || 1
      });
    } catch (err) {
      console.error('Failed to fetch stock movements:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  let totalInward = 0;
  let totalOutward = 0;
  movements.forEach((m) => {
    const change = parseFloat(m.quantity_change) || 0;
    if (change > 0) totalInward += change;
    else totalOutward += Math.abs(change);
  });

  const handleExportExcel = () => {
    const headers = ['Timestamp', 'Product Name', 'SKU', 'Movement Type', 'Quantity Change', 'Previous Stock', 'New Stock', 'Reference ID', 'Batch #', 'Notes'];
    const rows = movements.map((m) => [
      new Date(m.created_at).toLocaleString('en-IN'),
      m.product ? m.product.name : `Product #${m.product_id}`,
      m.product?.sku || '-',
      m.type,
      m.quantity_change,
      m.previous_quantity,
      m.new_quantity,
      m.reference_id || '-',
      m.batch_number || '-',
      m.notes || '-'
    ]);
    exportTableToCsv(`Stock-Movement-Audit-Trail-${Date.now()}`, headers, rows);
  };

  const handlePrint = () => {
    printReport('Stock Movement & Audit Trail Report', 'stock-movement-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Inward Quantity" value={`+${totalInward.toLocaleString('en-IN')} units`} subtext="Purchases, adjustments, returns" color="bg-emerald-50 text-emerald-800" />
        <ReportStatPill label="Total Outward Quantity" value={`-${totalOutward.toLocaleString('en-IN')} units`} subtext="Sales deductions & damages" color="bg-rose-50 text-rose-800" />
        <ReportStatPill label="Net Movement in View" value={`${(totalInward - totalOutward) >= 0 ? '+' : ''}${(totalInward - totalOutward).toLocaleString('en-IN')} units`} subtext={`${movements.length} logged events`} />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search product name or reference #..."
        onRefresh={fetchMovements}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E99FC1] focus:border-[#E99FC1] bg-white text-slate-700"
          >
            <option value="ALL">All Movement Types</option>
            <option value="SALE">Sale (Deduction)</option>
            <option value="PURCHASE">Purchase (Inward)</option>
            <option value="ADJUSTMENT">Stock Adjustment</option>
            <option value="RETURN">Sales Return</option>
            <option value="DAMAGE">Damaged / Expired</option>
          </select>
        }
      />

      {/* Table Container */}
      <div id="stock-movement-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Stock Movement Audit Trail</h3>
            <p className="text-xs text-slate-500">Physical inventory mutations log</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-3 py-3">Product Name</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3 text-center">Type</th>
                <th className="px-3 py-3 text-right font-bold">Qty Change</th>
                <th className="px-3 py-3 text-right">Prev Stock</th>
                <th className="px-3 py-3 text-right">New Stock</th>
                <th className="px-3 py-3">Reference ID</th>
                <th className="px-3 py-3">Batch #</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">Loading stock movements...</td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">No stock movements found</td>
                </tr>
              ) : (
                movements.map((m) => {
                  const change = parseFloat(m.quantity_change) || 0;
                  const isPositive = change > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">
                        {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {m.product ? m.product.name : `Product #${m.product_id}`}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{m.product?.sku || '-'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          m.type === 'SALE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          m.type === 'RETURN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? `+${change}` : change}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500">{m.previous_quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-900">{m.new_quantity}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 text-[11px]">{m.reference_id || '-'}</td>
                      <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{m.batch_number || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{m.notes || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ReportPagination
          currentPage={page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.total}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}

