import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, AlertCircle, Package, Layers, X } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { categoryService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export function CategoriesPage({ onFilterProductsByCategory }) {
  const { isAdmin } = useAuth();
  const { toast } = useNotification();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'delete'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'ACTIVE'
  });

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await categoryService.list();
      setCategories(res.data?.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = (presetName = '') => {
    setForm({ name: typeof presetName === 'string' ? presetName : '', description: '', status: 'ACTIVE' });
    setFormError('');
    setSelectedCategory(null);
    setModalType('create');
  };

  const openEditModal = (cat) => {
    setSelectedCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      status: cat.status || 'ACTIVE'
    });
    setFormError('');
    setModalType('edit');
  };

  const openDeleteModal = (cat) => {
    setSelectedCategory(cat);
    setModalType('delete');
  };

  const toggleStatus = async (cat) => {
    if (!isAdmin) return;
    const newStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await categoryService.update(cat.id, {
        name: cat.name,
        status: newStatus
      });
      toast.success(`Category marked ${newStatus.toLowerCase()}`);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to update category status');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedCategory) {
        await categoryService.update(selectedCategory.id, {
          name: form.name.trim(),
          description: form.description ? form.description.trim() : null,
          status: form.status || 'ACTIVE'
        });
        toast.success(`Category "${form.name}" updated successfully.`);
      } else {
        await categoryService.create({
          name: form.name.trim(),
          description: form.description ? form.description.trim() : null,
          status: form.status || 'ACTIVE'
        });
        toast.success(`Category "${form.name}" created successfully.`);
      }
      setModalType(null);
      fetchCategories();
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    try {
      setIsSubmitting(true);
      await categoryService.delete(selectedCategory.id);
      toast.success(
        `Category "${selectedCategory.name}" removed. Associated products remain safe as Uncategorized.`
      );
      setModalType(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to delete category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.description && c.description.toLowerCase().includes(term))
    );
  }, [categories, search]);

  const totalProductsCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (parseInt(c.product_count, 10) || 0), 0);
  }, [categories]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Product Categories
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {categories.length} total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize catalog inventory by departments, product families, and FMCG groups.
          </p>
        </div>

        {isAdmin && (
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Add Category
          </Button>
        )}
      </div>

      {/* Quick Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Categories</p>
              <p className="text-base font-bold text-slate-900">{categories.length}</p>
            </div>
          </div>
          <span className="text-xs text-slate-400">Active</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Categorized Products</p>
              <p className="text-base font-bold text-slate-900">{totalProductsCount} items</p>
            </div>
          </div>
          <span className="text-xs text-emerald-600 font-medium">In Catalog</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search categories by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Showing {filteredCategories.length} of {categories.length}
        </span>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchCategories}>
              Retry
            </Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Tag}
              title="No categories found"
              description={
                search
                  ? `No categories match "${search}".`
                  : 'Group your inventory items by creating your first category.'
              }
              action={
                isAdmin && (
                  <Button size="sm" icon={Plus} onClick={openCreateModal}>
                    Create Category
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Active Products</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <Tag className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{cat.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-sm">
                      {cat.description ? (
                        <span>{cat.description}</span>
                      ) : (
                        <span className="text-slate-300 italic">No description provided</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleStatus(cat)}
                        disabled={!isAdmin}
                        title={isAdmin ? `Click to ${cat.status === 'ACTIVE' ? 'deactivate' : 'activate'}` : undefined}
                        className="focus:outline-none"
                      >
                        <Badge variant={cat.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                          {cat.status || 'ACTIVE'}
                        </Badge>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onFilterProductsByCategory && onFilterProductsByCategory(cat.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium transition-colors"
                        title="Filter products in this category"
                      >
                        <Package className="w-3.5 h-3.5 text-slate-500" />
                        <span>{cat.product_count ?? 0} items</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          icon={Edit2}
                          onClick={() => openEditModal(cat)}
                          title="Edit Category"
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900"
                        >
                          Edit
                        </Button>

                        {isAdmin && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            icon={Trash2}
                            onClick={() => openDeleteModal(cat)}
                            title="Delete Category"
                            className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={modalType === 'create' || modalType === 'edit'}
        onClose={() => setModalType(null)}
        title={modalType === 'create' ? 'Add New Category' : `Edit Category: ${selectedCategory?.name}`}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <Input
              label="Category Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Biscuits & Cookies, Chocolates, Beverages"
              disabled={isSubmitting}
              required
              autoFocus
            />

          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short explanation of items falling in this category (optional)..."
              disabled={isSubmitting}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
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
              {modalType === 'create' ? 'Create Category' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={modalType === 'delete'}
        onClose={() => setModalType(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Category"
        message={`Are you sure you want to delete category "${selectedCategory?.name}"? All existing products assigned to this category will automatically be kept safe and marked as Uncategorized.`}
        confirmText="Delete Category"
        variant="danger"
        isLoading={isSubmitting}
      />
    </div>
  );
}
