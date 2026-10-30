import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, AlertCircle, Package } from 'lucide-react';
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
    description: ''
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

  const openCreateModal = () => {
    setForm({ name: '', description: '' });
    setFormError('');
    setSelectedCategory(null);
    setModalType('create');
  };

  const openEditModal = (cat) => {
    setSelectedCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description || ''
    });
    setFormError('');
    setModalType('edit');
  };

  const openDeleteModal = (cat) => {
    setSelectedCategory(cat);
    setModalType('delete');
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
          description: form.description ? form.description.trim() : null
        });
        toast.success(`Category "${form.name}" updated successfully.`);
      } else {
        await categoryService.create({
          name: form.name.trim(),
          description: form.description ? form.description.trim() : null
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

  const filteredCategories = categories.filter((c) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.description && c.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Product Categories
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize catalog inventory by departments, tags, and product families.
          </p>
        </div>

        {isAdmin && (
          <Button variant="primary" size="sm" icon={Plus} onClick={openCreateModal}>
            Add Category
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-subtle flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredCategories.length} categories total
        </span>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-card overflow-hidden">
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
                  <th className="py-3 px-4 text-center">Active Products</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{cat.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 max-w-sm">
                      {cat.description || <span className="text-slate-300 italic">None</span>}
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          title="Edit Category"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => openDeleteModal(cat)}
                            title="Delete Category"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              {formError}
            </div>
          )}

          <Input
            label="Category Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g. Computer Accessories, Apparel, Grocery"
            disabled={isSubmitting}
            required
          />

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Short explanation of items falling in this category..."
              disabled={isSubmitting}
              className="w-full text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors resize-none"
            />
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
