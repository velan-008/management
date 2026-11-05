import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // If already authenticated, redirect immediately
  if (isAuthenticated) {
    const destination = location.state?.from?.pathname || '/';
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim()) {
      setFormError('Email address is required.');
      return;
    }
    if (!password) {
      setFormError('Password is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      const destination = location.state?.from?.pathname || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFormError('');
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B89326] text-[#0B1120] items-center justify-center font-extrabold text-lg shadow-gold mb-3 border border-[#D4AF37]/40">
          BF
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1120]">
          Sign in to BUSINESSFLOW
        </h1>
        <p className="text-xs text-[#6E5513] mt-1 font-medium max-w-sm">
          Premium Wholesale POS & Distribution Management System
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm bg-white border border-[#D4AF37]/30 rounded-2xl shadow-popup overflow-hidden">
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#F4E7C4] to-[#D4AF37]" />

        <div className="p-6 sm:p-7">
          {(formError || authError) && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{formError || authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Work Email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@apexretail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              icon={Mail}
              required
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              icon={Lock}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2 bg-[#0B1120] text-[#D4AF37] hover:bg-[#162038] hover:text-white border border-[#D4AF37]/40 py-2.5 font-bold"
              isLoading={isSubmitting}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-[#6E5513] uppercase tracking-wider text-center mb-2.5">
              Test Credentials (Seeded)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@apexretail.com', 'Admin@123456')}
                className="px-2.5 py-2 text-xs bg-[#FAF5E8]/60 hover:bg-[#FAF5E8] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-xl text-slate-800 transition-all text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-[#0B1120]">Admin</span>
                  {email === 'admin@apexretail.com' && <Check className="w-3.5 h-3.5 text-[#B89326]" />}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 truncate font-medium">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('staff@apexretail.com', 'Staff@123456')}
                className="px-2.5 py-2 text-xs bg-[#FAF5E8]/60 hover:bg-[#FAF5E8] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-xl text-slate-800 transition-all text-left flex flex-col justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-[#0B1120]">Staff</span>
                  {email === 'staff@apexretail.com' && <Check className="w-3.5 h-3.5 text-[#B89326]" />}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 truncate font-medium">Billing / Cashier</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-3 text-center">
            <p className="text-xs text-slate-500">
              Need a new organization?{' '}
              <Link to="/register" className="font-bold text-[#0B1120] hover:text-[#D4AF37] transition-colors underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-6 text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span>Enterprise Wholesale Security & Session Authentication</span>
      </div>
    </div>
  );
};
