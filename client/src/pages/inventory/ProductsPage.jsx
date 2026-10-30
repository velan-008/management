import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertTriangle,
  History,
  Eye,
  SlidersHorizontal,
  Barcode
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { productService, categoryService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';
import { formatCurrency as formatCur } from '../../utils/formatters.js';

const UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Boxes (box)' },
  { value: 'pack', label: 'Packs (pack)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'ltr', label: 'Liters (ltr)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'dozen', label: 'Dozens (dozen)' },
  { value: 'pair', label: 'Pairs (pair)' },
  { value: 'set', label: 'Sets (set)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'ft', label: 'Feet (ft)' }
];

export function ProductsPage({ onNavigateToHistory }) {
  const { isAdmin, user, business } = useAuth();
  const { toast } = useNotification();
  const currency = business?.currency_symbol || '$';
  const isManagerOrAdmin = isAdmin || user?.role === 'ADMIN' || user?.role === 'MANAGER';

  // State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, limit: 15 });

  // Modals
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'view' | 'adjust' | 'deactivate'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    brand: '',
    description: '',
    cost_price: '0.00',
    selling_price: '',
    wholesale_price: '',
    batch_number: '',
    expiry_date: '',
    carton_pack_qty: '',
    quantity: '0',
    low_stock_threshold: '5',
    tax_rate: '0',
    unit: 'pcs',
    category_id: '',
    is_active: true
  });

  // Stock Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    quantity_change: '',
    type: 'ADJUSTMENT',
    notes: '',
    reference_id: ''
  });

  const formatCurrency = (val) => formatCur(val, currency);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryService.list();
      setCategories(res.data?.categories || []);
    } catch {
      // Non-fatal
    }
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 15,
        is_active: true
      };
      if (search.trim()) params.search = search.trim();
      if (filterCategory) params.category_id = filterCategory;
      if (stockStatus) params.stock_status = stockStatus;

      const res = await productService.list(params);
      setProducts(res.data?.products || []);
      setMeta(res.meta || { total: 0, totalPages: 1, limit: 15 });
    } catch (err) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, stockStatus]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle Form Input
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setForm({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: '',
      brand: '',
      description: '',
      cost_price: '0.00',
      selling_price: '',
      wholesale_price: '',
      batch_number: '',
      expiry_date: '',
      carton_pack_qty: '',
      quantity: '0',
      low_stock_threshold: '5',
      tax_rate: '0',
      unit: 'pcs',
      category_id: '',
      is_active: true
    });
    setFormError('');
    setSelectedProduct(null);
    setModalType('create');
  };

  // Open Edit Modal
  const openEditModal = (product) => {
    setSelectedProduct(product);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      brand: product.brand || '',
      description: product.description || '',
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      wholesale_price: product.wholesale_price || '',
      batch_number: product.batch_number || '',
      expiry_date: product.expiry_date || '',
      carton_pack_qty: product.carton_pack_qty || '',
      low_stock_threshold: String(product.low_stock_threshold),
      tax_rate: String(product.tax_rate),
      unit: product.unit || 'pcs',
      category_id: product.category_id ? String(product.category_id) : '',
      is_active: product.is_active !== false
    });
    setFormError('');
    setModalType('edit');
  };

  // Open View Modal
  const openViewModal = (product) => {
    setSelectedProduct(product);
    setModalType('view');
  };

  // Open Adjust Stock Modal
  const openAdjustModal = (product) => {
    setSelectedProduct(product);
    setAdjustForm({
      quantity_change: '',
      type: 'ADJUSTMENT',
      notes: '',
      reference_id: `ADJ-${Date.now().toString().slice(-5)}`
    });
    setFormError('');
    setModalType('adjust');
  };

  // Open Deactivate Confirmation
  const openDeactivateModal = (product) => {
    setSelectedProduct(product);
    setModalType('deactivate');
  };

  // Submit Product Form (Create / Edit)
  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!form.sku.trim()) {
      setFormError('SKU identifier is required.');
      return;
    }
    const sellPrice = parseFloat(form.selling_price);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      setFormError('Selling price must be greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedProduct) {
        await productService.update(selectedProduct.id, {
          name: form.name.trim(),
          sku: form.sku.trim(),
          barcode: form.barcode.trim() || null,
          brand: form.brand.trim() || null,
          description: form.description.trim() || null,
          cost_price: parseFloat(form.cost_price) || 0,
          selling_price: sellPrice,
          wholesale_price: form.wholesale_price ? parseFloat(form.wholesale_price) : null,
          batch_number: form.batch_number.trim() || null,
          expiry_date: form.expiry_date || null,
          carton_pack_qty: form.carton_pack_qty ? parseInt(form.carton_pack_qty, 10) : null,
          low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 5,
          tax_rate: parseFloat(form.tax_rate) || 0,
          unit: form.unit,
          category_id: form.category_id ? parseInt(form.category_id, 10) : null,
          is_active: form.is_active
        });
        toast.success(`Product "${form.name}" updated successfully.`);
      } else {
        await productService.create({
          name: form.name.trim(),
          sku: form.sku.trim(),
          barcode: form.barcode.trim() || null,
          brand: form.brand.trim() || null,
          description: form.description.trim() || null,
          cost_price: parseFloat(form.cost_price) || 0,
          selling_price: sellPrice,
          wholesale_price: form.wholesale_price ? parseFloat(form.wholesale_price) : null,
          batch_number: form.batch_number.trim() || null,
          expiry_date: form.expiry_date || null,
          carton_pack_qty: form.carton_pack_qty ? parseInt(form.carton_pack_qty, 10) : null,
          quantity: parseInt(form.quantity, 10) || 0,
          low_stock_threshold: parseInt(form.low_stock_threshold, 10) || 5,
          tax_rate: parseFloat(form.tax_rate) || 0,
          unit: form.unit,
          category_id: form.category_id ? parseInt(form.category_id, 10) : null,
          is_active: form.is_active
        });
        toast.success(`Product "${form.name}" created successfully.`);
      }
      setModalType(null);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Operation failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Stock Adjustment
  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    setFormError('');

    const change = parseInt(adjustForm.quantity_change, 10);
    if (isNaN(change) || change === 0) {
      setFormError('Quantity change must be a non-zero integer.');
      return;
    }

    if (selectedProduct && selectedProduct.quantity + change < 0) {
      setFormError(`Cannot reduce stock by ${Math.abs(change)}. Current stock is ${selectedProduct.quantity}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await productService.adjustStock(selectedProduct.id, {
        quantity_change: change,
        type: adjustForm.type,
        notes: adjustForm.notes.trim() || 'Manual adjustment',
        reference_id: adjustForm.reference_id.trim() || undefined
      });
      toast.success(`Stock adjusted for "${selectedProduct.name}".`);
      setModalType(null);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Stock adjustment failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Deactivation
  const handleConfirmDeactivate = async () => {
    if (!selectedProduct) return;
    try {
      setIsSubmitting(true);
      await productService.delete(selectedProduct.id);
      toast.success(`Product "${selectedProduct.name}" deactivated.`);
      setModalType(null);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Product Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your items, pricing, SKU barcodes, and live inventory stock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToHistory && (
            <Button
              variant="outline"
              size="sm"
              icon={History}
              onClick={() => onNavigateToHistory()}
            >
              Movement History
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={openCreateModal}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-subtle flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:bg-white focus:border-slate-800 cursor-pointer min-w-[130px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:bg-white focus:border-slate-800 cursor-pointer min-w-[130px]"
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock Healthy</option>
            <option value="low_stock">Low Stock Warning</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {(search || filterCategory || stockStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilterCategory('');
                setStockStatus('');
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Product Table Container */}
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
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchProducts}>
              Retry
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Package}
              title="No products found"
              description={
                search || filterCategory || stockStatus
                  ? 'No items match your active search and filter criteria.'
                  : 'Get started by creating your first product in your catalog.'
              }
              action={
                <Button size="sm" icon={Plus} onClick={openCreateModal}>
                  Create Product
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Item Details</th>
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Cost</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-center">In Stock</th>
                  <th className="py-3 px-4 text-center">Tax</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {products.map((p) => {
                  const isLow = p.quantity > 0 && p.quantity <= p.low_stock_threshold;
                  const isOut = p.quantity <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">
                          {p.name}
                        </div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                            {p.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-xs font-medium text-slate-700">
                          {p.sku}
                        </div>
                        {p.barcode && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                            <Barcode className="w-3 h-3" /> {p.barcode}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {p.category ? (
                          <Badge variant="info">{p.category.name}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatCurrency(p.cost_price)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(p.selling_price)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                              isOut
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {p.quantity} {p.unit}
                          </span>
                        </div>
                        {isLow && (
                          <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                            Low (min: {p.low_stock_threshold})
                          </div>
                        )}
                        {isOut && (
                          <div className="text-[10px] text-rose-600 font-medium mt-0.5">
                            Out of Stock
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-500">
                        {p.tax_rate}%
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openViewModal(p)}
                            title="View Overview"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openAdjustModal(p)}
                            title="Adjust Stock"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            title="Edit Details"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openDeactivateModal(p)}
                              title="Deactivate Product"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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

      {/* CREATE / EDIT PRODUCT MODAL */}
      <Modal
        isOpen={modalType === 'create' || modalType === 'edit'}
        onClose={() => setModalType(null)}
        title={modalType === 'create' ? 'Add New Product' : `Edit Product: ${selectedProduct?.name}`}
        size="lg"
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="Product Name"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="e.g. Parle-G Gold Biscuits (Pack of 12)"
                disabled={isSubmitting}
                required
              />
            </div>

            <Input
              label="SKU (Stock Keeping Unit)"
              name="sku"
              value={form.sku}
              onChange={handleFormChange}
              placeholder="e.g. SKU-LOGI-MX3S"
              disabled={isSubmitting}
              required
            />

            <Input
              label="Barcode / UPC / EAN"
              name="barcode"
              value={form.barcode}
              onChange={handleFormChange}
              placeholder="e.g. 097855160898"
              disabled={isSubmitting}
              icon={Barcode}
            />

            <Select
              label="Category"
              name="category_id"
              value={form.category_id}
              onChange={handleFormChange}
              disabled={isSubmitting}
              placeholder="Select category (Optional)"
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            />

            <Select
              label="Inventory Unit"
              name="unit"
              value={form.unit}
              onChange={handleFormChange}
              disabled={isSubmitting}
              options={UNITS}
            />

            <Input
              label="Cost Price"
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={handleFormChange}
              placeholder="0.00"
              disabled={isSubmitting}
            />

            <Input
              label="Brand / Manufacturer"
              name="brand"
              value={form.brand}
              onChange={handleFormChange}
              placeholder="e.g. Parle, Cadbury, Frooti"
              disabled={isSubmitting}
            />

            <Input
              label="Selling Price"
              name="selling_price"
              type="number"
              step="0.01"
              min="0"
              value={form.selling_price}
              onChange={handleFormChange}
              placeholder="0.00"
              disabled={isSubmitting}
              required
            />

            <Input
              label="Wholesale Price"
              name="wholesale_price"
              type="number"
              step="0.01"
              min="0"
              value={form.wholesale_price}
              onChange={handleFormChange}
              placeholder="0.00"
              disabled={isSubmitting}
              helperText="Bulk purchase rate"
            />

            <Input
              label="Batch Number"
              name="batch_number"
              value={form.batch_number}
              onChange={handleFormChange}
              placeholder="e.g. B-2026-01"
              disabled={isSubmitting}
            />

            <Input
              label="Expiry Date"
              name="expiry_date"
              type="date"
              value={form.expiry_date}
              onChange={handleFormChange}
              disabled={isSubmitting}
            />

            <Input
              label="Pack / Carton Qty"
              name="carton_pack_qty"
              type="number"
              min="1"
              value={form.carton_pack_qty}
              onChange={handleFormChange}
              placeholder="e.g. 24"
              disabled={isSubmitting}
              helperText="Pieces per outer box"
            />

            {modalType === 'create' && (
              <Input
                label="Initial Opening Quantity"
                name="quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={handleFormChange}
                placeholder="0"
                disabled={isSubmitting}
                helperText="Opening quantity will log an immutable stock movement audit entry."
              />
            )}

            <Input
              label="Low Stock Alert Threshold"
              name="low_stock_threshold"
              type="number"
              min="0"
              value={form.low_stock_threshold}
              onChange={handleFormChange}
              placeholder="5"
              disabled={isSubmitting}
              helperText="Dashboard warns when stock drops to or below this level."
            />

            <Input
              label="Tax Rate (%)"
              name="tax_rate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.tax_rate}
              onChange={handleFormChange}
              placeholder="0.00"
              disabled={isSubmitting}
            />

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                value={form.description}
                onChange={handleFormChange}
                placeholder="Item specification, color, size, compatibility..."
                disabled={isSubmitting}
                className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setModalType(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
            >
              {modalType === 'create' ? 'Create Product' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* STOCK ADJUSTMENT MODAL */}
      <Modal
        isOpen={modalType === 'adjust'}
        onClose={() => setModalType(null)}
        title={`Adjust Stock: ${selectedProduct?.name}`}
        size="sm"
      >
        <form onSubmit={handleSubmitAdjustment} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-500">Current In Stock:</span>
              <div className="font-mono text-base font-bold text-slate-900 mt-0.5">
                {selectedProduct?.quantity} {selectedProduct?.unit}
              </div>
            </div>
            {adjustForm.quantity_change && !isNaN(parseInt(adjustForm.quantity_change, 10)) && (
              <div className="text-right">
                <span className="text-slate-500">New Resulting Stock:</span>
                <div
                  className={`font-mono text-base font-bold mt-0.5 ${
                    (selectedProduct?.quantity || 0) + parseInt(adjustForm.quantity_change, 10) < 0
                      ? 'text-rose-600'
                      : 'text-indigo-600'
                  }`}
                >
                  {(selectedProduct?.quantity || 0) + parseInt(adjustForm.quantity_change, 10)} {selectedProduct?.unit}
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Quantity Change"
            id="quantity_change"
            name="quantity_change"
            type="number"
            value={adjustForm.quantity_change}
            onChange={(e) => setAdjustForm((prev) => ({ ...prev, quantity_change: e.target.value }))}
            placeholder="e.g. +25 for restock or -5 for breakage"
            helperText="Enter positive number to increment, or negative to decrement."
            disabled={isSubmitting}
            required
          />

          <Select
            label="Movement Reason / Category"
            id="movement_type"
            name="type"
            value={adjustForm.type}
            onChange={(e) => setAdjustForm((prev) => ({ ...prev, type: e.target.value }))}
            disabled={isSubmitting}
            options={[
              { value: 'ADJUSTMENT', label: 'Inventory Adjustment (Audit/Count)' },
              { value: 'PURCHASE', label: 'Purchase / Supplier Delivery' },
              { value: 'DAMAGE', label: 'Damage / Defective / Expired Loss' },
              { value: 'RETURN', label: 'Customer Return' }
            ]}
          />

          <Input
            label="Audit Notes / Reason"
            id="notes"
            name="notes"
            value={adjustForm.notes}
            onChange={(e) => setAdjustForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g. Physical inventory count variance, PO-88192"
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setModalType(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
            >
              Confirm Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW PRODUCT MODAL */}
      {selectedProduct && modalType === 'view' && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title={`Product: ${selectedProduct.name}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400">SKU</span>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">{selectedProduct.sku}</p>
              </div>
              <div>
                <span className="text-slate-400">Barcode</span>
                <p className="font-mono text-slate-800 mt-0.5">{selectedProduct.barcode || '—'}</p>
              </div>
              <div>
                <span className="text-slate-400">Category</span>
                <p className="font-medium text-slate-800 mt-0.5">
                  {selectedProduct.category ? selectedProduct.category.name : 'Uncategorized'}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Current Stock</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {selectedProduct.quantity} {selectedProduct.unit}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Cost Price</span>
                <p className="font-mono text-slate-800 mt-0.5">{formatCurrency(selectedProduct.cost_price)}</p>
              </div>
              <div>
                <span className="text-slate-400">Selling Price</span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(selectedProduct.selling_price)}</p>
              </div>
              <div>
                <span className="text-slate-400">Tax Rate</span>
                <p className="font-mono text-slate-800 mt-0.5">{selectedProduct.tax_rate}%</p>
              </div>
              <div>
                <span className="text-slate-400">Low Stock Alert</span>
                <p className="font-mono text-slate-800 mt-0.5">{selectedProduct.low_stock_threshold} {selectedProduct.unit}</p>
              </div>
              {selectedProduct.brand && (
                <div>
                  <span className="text-slate-400">Brand</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedProduct.brand}</p>
                </div>
              )}
              {selectedProduct.wholesale_price && (
                <div>
                  <span className="text-slate-400">Wholesale Price</span>
                  <p className="font-mono font-bold text-indigo-600 mt-0.5">{formatCurrency(selectedProduct.wholesale_price)}</p>
                </div>
              )}
              {selectedProduct.batch_number && (
                <div>
                  <span className="text-slate-400">Batch Number</span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedProduct.batch_number}</p>
                </div>
              )}
              {selectedProduct.expiry_date && (
                <div>
                  <span className="text-slate-400">Expiry Date</span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedProduct.expiry_date}</p>
                </div>
              )}
              {selectedProduct.carton_pack_qty && (
                <div>
                  <span className="text-slate-400">Carton Pack Qty</span>
                  <p className="font-mono text-slate-800 mt-0.5">{selectedProduct.carton_pack_qty} units/pack</p>
                </div>
              )}
            </div>

            {selectedProduct.description && (
              <div className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-1">Description:</span>
                {selectedProduct.description}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              {onNavigateToHistory && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={History}
                  onClick={() => {
                    setModalType(null);
                    onNavigateToHistory(selectedProduct.id);
                  }}
                >
                  View Movement History
                </Button>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={() => openEditModal(selectedProduct)}
              >
                Edit Product
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DEACTIVATE CONFIRMATION */}
      <ConfirmationModal
        isOpen={modalType === 'deactivate'}
        onClose={() => setModalType(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${selectedProduct?.name}"? Its sales history and stock movement ledger will remain permanently preserved.`}
        confirmText="Deactivate"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
