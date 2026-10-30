import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserCheck, Plus, Search, Edit2, Eye, UserX, UserCheck2,
  Calendar, DollarSign, Mail, Phone, Building, Briefcase,
  CheckCircle, AlertCircle, ShieldAlert
} from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { employeeService } from '../../services/businessServices.js';
import { useAuth } from '../../context/AuthContext.jsx';

function EmployeeForm({ employee, onSave, onClose }) {
  const [form, setForm] = useState({
    name: employee?.name || (employee ? `${employee.first_name || ''} ${employee.last_name || ''}`.trim() : ''),
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || employee?.designation || '',
    department: employee?.department || '',
    salary_amount: employee?.salary_amount !== undefined ? employee.salary_amount : (employee?.base_salary || 0),
    join_date: employee?.join_date || employee?.joining_date || new Date().toISOString().slice(0, 10),
    status: employee?.status || 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Employee name is required');
      return;
    }
    if (!form.position.trim()) {
      setError('Designation / position is required');
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      designation: form.position.trim(),
      position: form.position.trim(),
      department: form.department.trim() || null,
      base_salary: parseFloat(form.salary_amount) || 0,
      salary_amount: parseFloat(form.salary_amount) || 0,
      joining_date: form.join_date,
      join_date: form.join_date,
      status: form.status
    };

    try {
      if (employee) {
        await employeeService.update(employee.id, payload);
      } else {
        await employeeService.create(payload);
      }
      onSave();
    } catch (err) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="e.g. John Doe"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Designation / Position <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            required
            placeholder="e.g. Senior Cashier"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
          <input
            type="text"
            value={form.department}
            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
            placeholder="e.g. Sales, Operations"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="employee@company.com"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+1 555-0199"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Base Monthly Salary</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.salary_amount}
            onChange={(e) => setForm((f) => ({ ...f, salary_amount: e.target.value }))}
            placeholder="0.00"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Joining Date</label>
          <input
            type="date"
            value={form.join_date}
            onChange={(e) => setForm((f) => ({ ...f, join_date: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        {employee && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="TERMINATED">Deactivated / Terminated</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" isLoading={loading}>
          {employee ? 'Save Changes' : 'Add Employee'}
        </Button>
      </div>
    </form>
  );
}

function EmployeeDetailsModal({ employee, currency, onEdit, onDeactivate, onReactivate, onClose }) {
  if (!employee) return null;

  const isDeactivated = employee.status === 'TERMINATED';
  const fullName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  const salaryVal = parseFloat(employee.salary_amount || employee.base_salary || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="flex items-start justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">{fullName}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{employee.designation || employee.position || 'Staff'}</p>
          </div>
        </div>
        <Badge variant={isDeactivated ? 'danger' : employee.status === 'ON_LEAVE' ? 'warning' : 'success'}>
          {isDeactivated ? 'Deactivated' : employee.status === 'ON_LEAVE' ? 'On Leave' : 'Active'}
        </Badge>
      </div>

      {/* Detail Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" /> Department
          </span>
          <p className="font-semibold text-slate-800 text-sm">{employee.department || 'Not Assigned'}</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Designation
          </span>
          <p className="font-semibold text-slate-800 text-sm">{employee.designation || employee.position || '—'}</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Contact Email
          </span>
          <p className="font-semibold text-slate-800 text-sm truncate">{employee.email || '—'}</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Phone Number
          </span>
          <p className="font-semibold text-slate-800 text-sm">{employee.phone || '—'}</p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Monthly Salary
          </span>
          <p className="font-semibold text-slate-800 text-sm">
            {currency}{salaryVal}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Joining Date
          </span>
          <p className="font-semibold text-slate-800 text-sm">{employee.join_date || employee.joining_date || '—'}</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div>
          {isDeactivated ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={UserCheck2}
              onClick={() => onReactivate(employee)}
              className="text-emerald-700 hover:bg-emerald-50 border-emerald-200"
            >
              Reactivate Employee
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={UserX}
              onClick={() => onDeactivate(employee)}
              className="text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Deactivate Employee
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button type="button" size="sm" icon={Edit2} onClick={() => onEdit(employee)}>
            Edit Details
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmployeesPage() {
  const { business, user, isAdmin } = useAuth();
  const currency = business?.currency_symbol || '₹';

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modal, setModal] = useState(null); // 'create', 'edit', 'view', 'deactivate'
  const [selected, setSelected] = useState(null);
  const [notification, setNotification] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // Permission check: Admin or Manager or authorized staff
  const canManage = isAdmin || user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await employeeService.list();
      setEmployees(res.data?.employees || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSave = (msg = 'Saved successfully') => {
    setModal(null);
    setSelected(null);
    showNotification(msg);
    fetchEmployees();
  };

  const handleDeactivateConfirm = async () => {
    if (!selected) return;
    setIsDeactivating(true);
    try {
      await employeeService.deactivate(selected.id);
      showNotification(`${selected.name || 'Employee'} has been deactivated`);
      setModal(null);
      setSelected(null);
      fetchEmployees();
    } catch (err) {
      showNotification(err.message || 'Failed to deactivate employee');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleReactivate = async (emp) => {
    try {
      await employeeService.update(emp.id, { status: 'ACTIVE' });
      showNotification(`${emp.name || 'Employee'} reactivated successfully`);
      setModal(null);
      setSelected(null);
      fetchEmployees();
    } catch (err) {
      showNotification(err.message || 'Failed to reactivate employee');
    }
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const empName = (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase();
      const pos = (emp.designation || emp.position || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      const mail = (emp.email || '').toLowerCase();
      const ph = (emp.phone || '').toLowerCase();
      const q = search.toLowerCase().trim();

      const matchesSearch = !q || empName.includes(q) || pos.includes(q) || dept.includes(q) || mail.includes(q) || ph.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'ACTIVE') return emp.status === 'ACTIVE';
      if (statusFilter === 'ON_LEAVE') return emp.status === 'ON_LEAVE';
      if (statusFilter === 'TERMINATED') return emp.status === 'TERMINATED';
      return true;
    });
  }, [employees, search, statusFilter]);

  if (!canManage) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Only Managers or authorized staff have permission to view and manage employee records.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg border border-slate-800 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Employees & HR</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage employee details, designations, departments, and operational records.
          </p>
        </div>
        <Button
          icon={Plus}
          size="sm"
          onClick={() => {
            setSelected(null);
            setModal('create');
          }}
        >
          Add Employee
        </Button>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, designation, department, email..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: 'All', value: 'ALL' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'On Leave', value: 'ON_LEAVE' },
            { label: 'Deactivated', value: 'TERMINATED' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === tab.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16 px-4">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold text-sm">No employees found</p>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'ALL'
              ? 'Try adjusting your search criteria or filter to locate employees.'
              : 'Add your first employee record to begin managing staff details.'}
          </p>
          {!search && statusFilter === 'ALL' && (
            <Button
              size="sm"
              icon={Plus}
              className="mt-4"
              onClick={() => {
                setSelected(null);
                setModal('create');
              }}
            >
              Add Employee
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => {
            const isTerminated = emp.status === 'TERMINATED';
            const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
            const badgeVariant = isTerminated
              ? 'danger'
              : emp.status === 'ON_LEAVE'
              ? 'warning'
              : emp.user?.role === 'MANAGER'
              ? 'info'
              : 'neutral';

            return (
              <div
                key={emp.id}
                className={`bg-white rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                  isTerminated
                    ? 'border-slate-200/80 bg-slate-50/50 opacity-80'
                    : 'border-slate-200 shadow-subtle hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {empName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{empName}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.designation || emp.position || 'Staff'}</p>
                      </div>
                    </div>
                    <Badge variant={badgeVariant}>
                      {isTerminated ? 'Deactivated' : emp.status === 'ON_LEAVE' ? 'On Leave' : (emp.user?.role || 'Active')}
                    </Badge>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                    {emp.department && (
                      <div className="flex items-center gap-2 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.department}</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.phone}</span>
                      </div>
                    )}
                    {emp.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {currency}
                        {parseFloat(emp.salary_amount || emp.base_salary || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2
                        })}{' '}
                        / month
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Joined: {emp.join_date || emp.joining_date || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Eye}
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSelected(emp);
                      setModal('view');
                    }}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Edit2}
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSelected(emp);
                      setModal('edit');
                    }}
                  >
                    Edit
                  </Button>
                  {isTerminated ? (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={UserCheck2}
                      className="px-2.5 text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                      title="Reactivate"
                      onClick={() => handleReactivate(emp)}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={UserX}
                      className="px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                      title="Deactivate"
                      onClick={() => {
                        setSelected(emp);
                        setModal('deactivate');
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Employee Modal */}
      <Modal
        isOpen={modal === 'create'}
        onClose={() => setModal(null)}
        title="Add Employee"
        size="lg"
      >
        <EmployeeForm
          onSave={() => handleSave('Employee added successfully')}
          onClose={() => setModal(null)}
        />
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={modal === 'edit'}
        onClose={() => setModal(null)}
        title="Edit Employee Details"
        size="lg"
      >
        {selected && (
          <EmployeeForm
            employee={selected}
            onSave={() => handleSave('Employee details updated')}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      {/* View Employee Details Modal */}
      <Modal
        isOpen={modal === 'view'}
        onClose={() => setModal(null)}
        title="Employee Details"
        size="md"
      >
        {selected && (
          <EmployeeDetailsModal
            employee={selected}
            currency={currency}
            onEdit={(emp) => {
              setSelected(emp);
              setModal('edit');
            }}
            onDeactivate={(emp) => {
              setSelected(emp);
              setModal('deactivate');
            }}
            onReactivate={handleReactivate}
            onClose={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <ConfirmationModal
        isOpen={modal === 'deactivate'}
        onClose={() => setModal(null)}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate Employee"
        message={`Are you sure you want to deactivate ${selected?.name || 'this employee'}? Their status will be set to Deactivated.`}
        confirmText="Confirm Deactivation"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
}
