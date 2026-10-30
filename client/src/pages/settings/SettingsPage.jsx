import React, { useState, useEffect } from 'react';
import { Settings, Building2, User, Lock, Bell, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';

export function SettingsPage() {
  const { user, business, refreshUser } = useAuth();
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('business');

  const showNotification = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 3000); };

  const tabs = [
    { id: 'business', label: 'Business', icon: Building2 },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          <CheckCircle className="w-4 h-4" /> {notification}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your business and account preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Business Settings */}
      {activeTab === 'business' && (
        <BusinessSettings business={business} refreshUser={refreshUser} onSave={showNotification} />
      )}

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <ProfileSettings user={user} onSave={showNotification} />
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <SecuritySettings onSave={showNotification} />
      )}
    </div>
  );
}

const DEFAULT_TAX_RATES = [
  { value: 0, label: '0% — Exempt / Nil Tax' },
  { value: 5, label: '5% — GST / Reduced Rate (5%)' },
  { value: 12, label: '12% — GST / Standard Rate (12%)' },
  { value: 18, label: '18% — GST / Wholesale Standard (18%)' },
  { value: 28, label: '28% — GST / Higher Rate (28%)' }
];

function BusinessSettings({ business, refreshUser, onSave }) {
  const [form, setForm] = useState({
    name: business?.name || '',
    email: business?.email || '',
    phone: business?.phone || '',
    address: business?.address || '',
    currency_code: business?.currency_code || 'USD',
    currency_symbol: business?.currency_symbol || '$',
    state: business?.state || '',
    tax_name: business?.tax_name || 'GST',
    tax_rate: business?.tax_rate ?? 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchBusinessDetails = async () => {
      try {
        const res = await api.get('/businesses/me');
        const b = res.data?.business || res.data;
        if (mounted && b) {
          setForm(prev => ({
            ...prev,
            name: b.name || '',
            email: b.email || '',
            phone: b.phone || '',
            address: b.address || '',
            currency_code: b.currency_code || prev.currency_code || 'USD',
            currency_symbol: b.currency_symbol || prev.currency_symbol || '$',
            state: b.state || '',
            tax_name: b.tax_name || prev.tax_name || 'GST',
            tax_rate: b.tax_rate ?? prev.tax_rate ?? 0
          }));
        }
      } catch {
        if (mounted && business) {
          setForm(prev => ({
            ...prev,
            name: business.name || '',
            email: business.email || '',
            phone: business.phone || '',
            address: business.address || '',
            currency_code: business.currency_code || 'USD',
            currency_symbol: business.currency_symbol || '$',
            state: business.state || ''
          }));
        }
      }
    };
    fetchBusinessDetails();
    return () => { mounted = false; };
  }, [business]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.name.trim()) {
      alert('Please enter a valid Business Name');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone ? form.phone.trim() : null,
        address: form.address ? form.address.trim() : null,
        state: form.state ? form.state.trim() : 'Default',
        tax_name: form.tax_name || 'GST',
        tax_rate: form.tax_rate ?? 0,
        currency_code: form.currency_code || 'USD',
        currency_symbol: form.currency_symbol || '$'
      };

      if (form.email && form.email.trim()) {
        payload.email = form.email.trim().toLowerCase();
      }

      await api.put('/businesses/me', payload);
      if (refreshUser) await refreshUser();
      onSave('Business settings saved!');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save settings';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Business Information</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Business Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Business Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Default Tax Rate (%)</label>
          <select
            value={Number(form.tax_rate)}
            onChange={e => setForm(f => ({ ...f, tax_rate: parseFloat(e.target.value) || 0 }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
          >
            {DEFAULT_TAX_RATES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
            {!DEFAULT_TAX_RATES.some(r => Number(r.value) === Number(form.tax_rate)) && (
              <option value={form.tax_rate}>{form.tax_rate}% (Custom)</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">State / Region</label>
          <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="e.g. Maharashtra" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
          <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none" />
        </div>
      </div>
      <Button type="submit" isLoading={loading}>Save Business Settings</Button>
    </form>
  );
}

function ProfileSettings({ user, onSave }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put('/auth/me', form);
      onSave('Profile updated!');
    } catch (err) {
      alert(err.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">My Profile</h2>
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
        <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-700 font-bold text-lg flex items-center justify-center">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{user?.name}</p>
          <p className="text-sm text-slate-500">{user?.role}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
      </div>
      <Button type="submit" isLoading={loading}>Update Profile</Button>
    </form>
  );
}

function SecuritySettings({ onSave }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.new_password !== form.confirm_password) { setError('New passwords do not match'); return; }
    if (form.new_password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: form.current_password, new_password: form.new_password });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      onSave('Password changed successfully!');
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-800">Change Password</h2>
      {error && <div className="bg-rose-50 text-rose-700 text-sm px-3 py-2 rounded-lg border border-rose-200">{error}</div>}
      <div className="space-y-3 max-w-sm">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Current Password</label>
          <input type="password" value={form.current_password} onChange={e => setForm(f => ({ ...f, current_password: e.target.value }))} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
          <input type="password" value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Confirm New Password</label>
          <input type="password" value={form.confirm_password} onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
      </div>
      <Button type="submit" isLoading={loading} icon={Lock}>Change Password</Button>
    </form>
  );
}
