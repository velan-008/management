import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layers, Plus, Edit2, Trash2, Search, AlertCircle, Package, Tag, Filter, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { subCategoryService, categoryService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export function SubCategoriesPage({ onFilterProductsBySubCategory }) {
  const { isAdmin } = useAuth();
  const { toast } = useNotification();

  const [subCategories, setSubCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  // Modals
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'delete'
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    description: '',
    status: 'ACTIVE'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scRes, catRes] = await Promise.all([
        subCategoryService.list(),
        categoryService.list()
      ]);
      setSubCategories(scRes.data?.subCategories || []);
      setCategories(catRes.data?.categories || []);
    } catch (err) {
      setError(err.message || 'Failed to load sub-categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = () => {
    setForm({
      name: '',
      category_id: selectedCategoryFilter || (categories[0]?.id ? String(categories[0].id) : ''),
      description: '',
      status: 'ACTIVE'
    });
    setFormError('');
    setSelectedItem(null);
    setModalType('create');
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setForm({
      name: item.name,
      category_id: item.category_id ? String(item.category_id) : '',
      description: item.description || '',
      status: item.status || 'ACTIVE'
    });
    setFormError('');
    setModalType('edit');
  };

  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setModalType('delete');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Sub-category name is required.');
      return;
    }
    if (!form.category_id) {
      setFormError('Please select a parent Category.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: form.name.trim(),
        category_id: parseInt(form.category_id, 10),
        description: form.description ? form.description.trim() : null,
        status: form.status || 'ACTIVE'
      };

      if (selectedItem) {
        await subCategoryService.update(selectedItem.id, payload);
        toast.success(`Sub-category "${form.name}" updated successfully.`);
      } else {
        await subCategoryService.create(payload);
        toast.success(`Sub-category "${form.name}" created successfully.`);
      }

      setModalType(null);
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save sub-category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await subCategoryService.delete(selectedItem.id);
      toast.success(`Sub-category "${selectedItem.name}" deleted.`);
      setModalType(null);
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete sub-category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (item) => {
    if (!isAdmin) return;
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await subCategoryService.update(item.id, {
        category_id: item.category_id,
        name: item.name,
        status: newStatus
      });
      toast.success(`Sub-category marked ${newStatus.toLowerCase()}`);
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredItems = useMemo(() => {
    return subCategories.filter((sc) => {
      const matchesSearch =
        sc.name?.toLowerCase().includes(search.toLowerCase()) ||
        sc.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
        sc.description?.toLowerCase().includes(search.toLowerCase());

      const matchesCat = selectedCategoryFilter
        ? String(sc.category_id) === String(selectedCategoryFilter)
        : true;

      return matchesSearch && matchesCat;
    });
  }, [subCategories, search, selectedCategoryFilter]);

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#D4AF37]" />
            <span>Sub-Categories Master</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize products into detailed subcategories under FMCG parent categories
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 shadow-sm text-xs font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sub-Category</span>
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search sub-categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] focus:border-transparent transition-all shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full sm:w-56 py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all shadow-xs"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchData} className="ml-auto text-xs py-1">
            Retry
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={search || selectedCategoryFilter ? 'No matching sub-categories' : 'No sub-categories yet'}
          description={
            search || selectedCategoryFilter
              ? 'Try adjusting your search terms or parent category filter.'
              : 'Add your first FMCG sub-category to organize inventory items.'
          }
          actionLabel={isAdmin ? 'Add Sub-Category' : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const productCount = parseInt(item.product_count, 10) || 0;
            const isActive = item.status === 'ACTIVE';

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/90 hover:border-[#D4AF37]/50 p-4 flex flex-col justify-between transition-all shadow-subtle hover:shadow-gold"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{item.name}</h3>
                        <button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          disabled={!isAdmin}
                          title={isAdmin ? `Click to ${isActive ? 'deactivate' : 'activate'}` : undefined}
                          className="focus:outline-none"
                        >
                          <Badge variant={isActive ? 'success' : 'default'} size="sm">
                            {isActive ? 'ACTIVE' : 'INACTIVE'}
                          </Badge>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-[#917118] bg-[#FAF5E8] border border-[#D4AF37]/30 px-2 py-0.5 rounded-md">
                          {item.category?.name || 'Uncategorized'}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">
                      {productCount} {productCount === 1 ? 'Product' : 'Products'}
                    </span>
                  </div>

                  {onFilterProductsBySubCategory && (
                    <button
                      type="button"
                      onClick={() => onFilterProductsBySubCategory(item.id)}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2"
                    >
                      View Items &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(modalType === 'create' || modalType === 'edit') && (
        <Modal
          isOpen={true}
          onClose={() => setModalType(null)}
          title={modalType === 'create' ? 'Add Sub-Category' : 'Edit Sub-Category'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Parent Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Sub-Category Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Chocolate Bars, Cream Biscuits, Cola"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
              <textarea
                placeholder="Brief description of items under this subcategory..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalType(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting}>
                {modalType === 'create' ? 'Create Sub-Category' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {modalType === 'delete' && selectedItem && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setModalType(null)}
          onConfirm={handleDelete}
          isLoading={isSubmitting}
          title="Delete Sub-Category"
          message={`Are you sure you want to delete "${selectedItem.name}"? Products in this sub-category will remain safe and be marked as unassigned.`}
          confirmLabel="Delete Sub-Category"
          variant="danger"
        />
      )}
    </div>
  );
}
export default SubCategoriesPage;

