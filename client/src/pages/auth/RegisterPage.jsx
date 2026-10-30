import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, MapPin, DollarSign, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { authService } from '../../services/authService.js';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser } = useAuth();

  const [form, setForm] = useState({
    businessName: '',
    businessEmail: '',
    name: '',
    email: '',
    password: '',
    state: '',
    currencyCode: 'USD',
    currencySymbol: '$'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.businessName.trim()) {
      setFormError('Organization name is required.');
      return;
    }
    if (!form.businessEmail.trim()) {
      setFormError('Business email address is required.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('Administrator full name is required.');
      return;
    }
    if (!form.email.trim()) {
      setFormError('Admin login email is required.');
      return;
    }
    if (!form.password || form.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.register(form);
      if (refreshUser) {
        await refreshUser();
      }
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Registration failed. Please review your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex w-10 h-10 rounded-xl bg-slate-900 text-white items-center justify-center font-bold text-base shadow-sm mb-3">
          BF
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Create your BUSINESSFLOW account
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Set up your organization, admin credentials, and currency in seconds.
        </p>
      </div>

      {/* Main Register Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 sm:p-7">
        {formError && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-medium leading-relaxed">{formError}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Organization Name"
              id="businessName"
              name="businessName"
              placeholder="Apex Retail Corp"
              value={form.businessName}
              onChange={handleChange}
              disabled={isSubmitting}
              icon={Building2}
              required
            />

            <Input
              label="Business Contact Email"
              id="businessEmail"
              name="businessEmail"
              type="email"
              placeholder="contact@apexretail.com"
              value={form.businessEmail}
              onChange={handleChange}
              disabled={isSubmitting}
              icon={Mail}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Admin Full Name"
              id="name"
              name="name"
              placeholder="Sarah Connor"
              value={form.name}
              onChange={handleChange}
              disabled={isSubmitting}
              icon={User}
              required
            />

            <Input
              label="Admin Login Email"
              id="email"
              name="email"
              type="email"
              placeholder="admin@apexretail.com"
              value={form.email}
              onChange={handleChange}
              disabled={isSubmitting}
              icon={Mail}
              required
            />
          </div>

          <Input
            label="Password (min 8 chars, 1 uppercase, 1 digit)"
            id="password"
            name="password"
            type="password"
            placeholder="••••••••••••"
            value={form.password}
            onChange={handleChange}
            disabled={isSubmitting}
            icon={Lock}
            required
          />

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="State / Region"
              id="state"
              name="state"
              placeholder="California"
              value={form.state}
              onChange={handleChange}
              disabled={isSubmitting}
              icon={MapPin}
            />

            <Input
              label="Currency Code"
              id="currencyCode"
              name="currencyCode"
              placeholder="USD"
              value={form.currencyCode}
              onChange={handleChange}
              disabled={isSubmitting}
            />

            <Input
              label="Symbol"
              id="currencySymbol"
              name="currencySymbol"
              placeholder="$"
              value={form.currencySymbol}
              onChange={handleChange}
              disabled={isSubmitting}
              icon={DollarSign}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            isLoading={isSubmitting}
          >
            <span>Register Organization</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-slate-900 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
