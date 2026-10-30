import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { productService } from '../../services/businessServices.js';
import { formatDateTime } from '../../utils/formatters.js';

export function StockHistoryPage({ initialProductId, onBackToProducts }) {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId || '');
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 20 });

  // Load product list for filter dropdown
  useEffect(() => {
    productService
      .list({ limit: 100, is_active: true })
      .then((res) => setProducts(res.data?.products || []))
      .catch(() => {});
  }, []);

  // Fetch movements
  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (selectedProductId) {
        res = await productService.stockMovements(selectedProductId, { page, limit: 20 });
      } else {
        res = await productService.allMovements({
          page,
          limit: 20,
          type: selectedType || undefined
        });
      }
      setMovements(res.data?.movements || []);
      setMeta(res.meta || { total: 0, totalPages: 1, limit: 20 });
    } catch (err) {
      setError(err.message || 'Failed to retrieve stock movement ledger');
    } finally {
      setLoading(false);
    }
  }, [page, selectedProductId, selectedType]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'PURCHASE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3" /> Purchase / Restock
          </span>
        );
      case 'SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ArrowDownRight className="w-3 h-3" /> Sale Fulfilled
          </span>
        );
      case 'RETURN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3 h-3" /> Restocked Return
          </span>
        );
      case 'DAMAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" /> Damage / Loss
          </span>
        );
      case 'ADJUSTMENT':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Audit Adjustment
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Stock Movement History & Audit Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking of stock receipts, decrements, adjustments, and returns.
          </p>
        </div>

        {onBackToProducts && (
          <Button variant="outline" size="sm" onClick={onBackToProducts}>
            Back to Products Catalog
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:bg-white focus:border-slate-800 cursor-pointer min-w-[200px]"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>

          {!selectedProductId && (
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:bg-white focus:border-slate-800 cursor-pointer min-w-[150px]"
            >
              <option value="">All Movement Types</option>
              <option value="PURCHASE">Purchases / Restocks</option>
              <option value="SALE">Sales Decrements</option>
              <option value="RETURN">Customer Returns</option>
              <option value="DAMAGE">Damages & Losses</option>
              <option value="ADJUSTMENT">Manual Adjustments</option>
            </select>
          )}

          {(selectedProductId || selectedType) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedProductId('');
                setSelectedType('');
                setPage(1);
              }}
            >
              Reset Filters
            </Button>
          )}
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Total Logged Records: <strong className="text-slate-800">{meta.total}</strong>
        </span>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchMovements}>
              Retry
            </Button>
          </div>
        ) : movements.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={History}
              title="No stock movements recorded"
              description="Stock additions, sales, manual adjustments, and returns will record here automatically."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Product / SKU</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4 text-center">Qty Change</th>
                  <th className="py-3 px-4 text-center">Stock Before → After</th>
                  <th className="py-3 px-4">Reference / Notes</th>
                  <th className="py-3 px-4 text-right">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {movements.map((m) => {
                  const isPositive = m.quantity_change > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(m.created_at)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {m.product?.name || `Product #${m.product_id}`}
                        </div>
                        {m.product?.sku && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            {m.product.sku}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">{getTypeBadge(m.type)}</td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        <span>{m.previous_quantity}</span>
                        <span className="text-slate-400 mx-1.5">→</span>
                        <strong className="text-slate-900">{m.new_quantity}</strong>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        {m.reference_id && (
                          <span className="font-mono text-[11px] font-semibold text-slate-700 block">
                            {m.reference_id}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {m.notes || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-slate-800">
                          {m.user?.name || 'System'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={meta.limit}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
