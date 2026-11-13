import React, { useState, useEffect, useCallback } from 'react';
import { productService, reportService } from '../../services/businessServices.js';
import { ReportActionBar, ReportPagination, ReportStatPill, exportTableToCsv, printReport } from './reportUtils.jsx';

export function InventoryReportTab({ currency = '₹' }) {
  const [products, setProducts] = useState([]);
  const [invSummary, setInvSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, summaryRes] = await Promise.all([
        productService.list({ page, limit: 15, search }),
        reportService.getInventory()
      ]);
      const rows = prodRes.data?.products || [];
      setProducts(rows);
      setInvSummary(summaryRes.data);
      setPagination({
        total: prodRes.meta?.total || rows.length,
        totalPages: prodRes.meta?.totalPages || 1
      });
    } catch (err) {
      console.error('Failed to fetch inventory report:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Apply stock status filter on current view
  const filteredProducts = products.filter((p) => {
    const q = p.quantity || 0;
    const threshold = p.low_stock_threshold || 10;
    if (stockFilter === 'LOW') return q > 0 && q <= threshold;
    if (stockFilter === 'OUT') return q <= 0;
    if (stockFilter === 'IN') return q > threshold;
    return true;
  });

  const totalCostVal = invSummary?.totalCostValuation || products.reduce((sum, p) => sum + (p.quantity || 0) * (parseFloat(p.cost_price) || 0), 0);
  const totalRetailVal = invSummary?.totalRetailValuation || products.reduce((sum, p) => sum + (p.quantity || 0) * (parseFloat(p.selling_price) || 0), 0);
  const lowCount = invSummary?.lowStockCount || products.filter((p) => (p.quantity || 0) <= (p.low_stock_threshold || 10)).length;

  const handleExportExcel = () => {
    const headers = ['SKU', 'Barcode', 'Product Name', 'Category', 'Stock Qty', 'Unit', 'Cost Price', 'Selling Price', 'Total Cost Value', 'Total Retail Value', 'Stock Status'];
    const rows = filteredProducts.map((p) => [
      p.sku,
      p.barcode || '',
      p.name,
      p.category ? p.category.name : 'Uncategorized',
      p.quantity || 0,
      p.unit || 'PCS',
      p.cost_price,
      p.selling_price,
      ((p.quantity || 0) * (parseFloat(p.cost_price) || 0)).toFixed(2),
      ((p.quantity || 0) * (parseFloat(p.selling_price) || 0)).toFixed(2),
      (p.quantity <= 0 ? 'Out of Stock' : p.quantity <= p.low_stock_threshold ? 'Low Stock' : 'In Stock')
    ]);
    exportTableToCsv(`Inventory-Valuation-Report-${Date.now()}`, headers, rows);
  };

  const handlePrint = () => {
    printReport('Inventory Valuation & Health Report', 'inventory-report-printable');
  };

  return (
    <div className="space-y-4">
      {/* KPI Stats */}
      <div className="flex gap-3 flex-wrap">
        <ReportStatPill label="Total Active Products" value={invSummary?.totalProducts || pagination.total} subtext="Tracked items" />
        <ReportStatPill label="Inventory Cost Valuation" value={`${currency}${totalCostVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Asset value at cost" />
        <ReportStatPill label="Retail Value at Sale" value={`${currency}${totalRetailVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} subtext="Potential gross revenue" />
        <ReportStatPill label="Low / Zero Stock Alerts" value={lowCount} subtext="Items at reorder point" color="bg-rose-50 text-rose-700" />
      </div>

      {/* Action Bar */}
      <ReportActionBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, SKU or barcode..."
        onRefresh={fetchInventory}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        extraFilters={
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E99FC1] focus:border-[#E99FC1] bg-white text-slate-700"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN">In Stock (Healthy)</option>
            <option value="LOW">Low Stock Alert</option>
            <option value="OUT">Out of Stock</option>
          </select>
        }
      />

      {/* Table Container */}
      <div id="inventory-report-printable" className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Inventory Valuation & Stock Levels</h3>
            <p className="text-xs text-slate-500">Live balance as of {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-3 py-3">Product Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Stock Qty</th>
                <th className="px-3 py-3">Unit</th>
                <th className="px-3 py-3 text-right">Cost Price</th>
                <th className="px-3 py-3 text-right">Selling Price</th>
                <th className="px-3 py-3 text-right font-bold">Cost Value</th>
                <th className="px-3 py-3 text-right font-bold">Retail Value</th>
                <th className="px-4 py-3 text-center">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">Loading inventory data...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">No products match current filters</td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const q = p.quantity || 0;
                  const cost = parseFloat(p.cost_price || 0);
                  const retail = parseFloat(p.selling_price || 0);
                  const isLow = q <= (p.low_stock_threshold || 10) && q > 0;
                  const isOut = q <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-600">{p.sku}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{p.name}</td>
                      <td className="px-3 py-2.5 text-slate-600">{p.category ? p.category.name : '-'}</td>
                      <td className={`px-3 py-2.5 text-right font-mono font-bold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {q}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">{p.unit || 'PCS'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">{currency}{cost.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-900">{currency}{retail.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-700">{currency}{(q * cost).toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{currency}{(q * retail).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isOut ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          isLow ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
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

