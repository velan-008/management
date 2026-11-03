import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Scale, Plus, Edit2, Trash2, Search, AlertCircle, Package } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { unitService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotification } from '../../context/NotificationContext.jsx';

export function UnitsPage() {
  const { isAdmin } = useAuth();
  const { toast } = useNotification();

  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Modals
  const [modalType, setModalType] = useState(null); // 'create' | 'edit' | 'delete'
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'ACTIVE'
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await unitService.list();
      setUnits(res.data?.units || []);
    } catch (err) {
      setError(err.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateModal = (preset = null) => {
    setForm({
      name: preset?.name || '',
      code: preset?.code || '',
      description: preset ? `${preset.name} measurement unit` : '',
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
      code: item.code,
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
      setFormError('Unit name is required.');
      return;
    }
    if (!form.code.trim()) {
      setFormError('Unit code / symbol is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description ? form.description.trim() : null,
        status: form.status || 'ACTIVE'
      };

      if (selectedItem) {
        await unitService.update(selectedItem.id, payload);
        toast.success(`Unit "${form.name}" updated successfully.`);
      } else {
        await unitService.create(payload);
        toast.success(`Unit "${form.name}" created successfully.`);
      }

      setModalType(null);
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setIsSubmitting(true);
      await unitService.delete(selectedItem.id);
      toast.success(`Unit "${selectedItem.name}" deleted.`);
      setModalType(null);
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete unit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (item) => {
    if (!isAdmin) return;
    const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await unitService.update(item.id, {
        name: item.name,
        code: item.code,
        status: newStatus
      });
      toast.success(`Unit marked ${newStatus.toLowerCase()}`);
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const filteredItems = useMemo(() => {
    return units.filter((u) => {
      return (
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.code?.toLowerCase().includes(search.toLowerCase()) ||
        u.description?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [units, search]);

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            <span>Units Master</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define FMCG measurement and wholesale packaging units (Pcs, Box, Carton, Kg, L)
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 shadow-sm text-xs font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Unit</span>
          </Button>
        )}
      </div>



      {/* Search */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search units by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all shadow-xs"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
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
          icon={Scale}
          title={search ? 'No matching units' : 'No units yet'}
          description={
            search ? 'Try adjusting your search terms.' : 'Add your first FMCG unit to quantify inventory items.'
          }
          actionLabel={isAdmin ? 'Add Unit' : undefined}
          onAction={isAdmin ? () => openCreateModal() : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const productCount = parseInt(item.product_count, 10) || 0;
            const isActive = item.status === 'ACTIVE';

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-4 flex flex-col justify-between transition-all hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2 py-0.5 rounded-md shrink-0">
                          {item.code}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 truncate">{item.name}</h3>
                      </div>

                      <div className="mt-2">
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
          title={modalType === 'create' ? 'Add Unit' : 'Edit Unit'}
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
                Unit Name <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. Carton, Box, Piece, Kilogram"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unit Code / Symbol <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="e.g. CTN, BOX, PCS, KG, L"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
              <textarea
                placeholder="Details about unit packaging or conversion..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
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
                {modalType === 'create' ? 'Create Unit' : 'Save Changes'}
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
          title="Delete Unit"
          message={`Are you sure you want to delete unit "${selectedItem.name} (${selectedItem.code})"? Products with this unit will retain their textual unit value.`}
          confirmLabel="Delete Unit"
          variant="danger"
        />
      )}
    </div>
  );
}
export default UnitsPage;

