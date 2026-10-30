import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight, Check } from 'lucide-react';
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="inline-flex w-10 h-10 rounded-xl bg-slate-900 text-white items-center justify-center font-bold text-base shadow-sm mb-3">
          BF
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Sign in to BUSINESSFLOW
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Enterprise management platform for retail stores, inventory, and operations.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-2xl shadow-card p-6 sm:p-7">
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
            className="w-full mt-2"
            isLoading={isSubmitting}
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
            Test Credentials (Seeded)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@apexretail.com', 'Admin@123456')}
              className="px-2.5 py-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-slate-900">Admin</span>
                {email === 'admin@apexretail.com' && <Check className="w-3 h-3 text-emerald-600" />}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 truncate">Full Access</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoFill('staff@apexretail.com', 'Staff@123456')}
              className="px-2.5 py-2 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors text-left flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-slate-900">Staff</span>
                {email === 'staff@apexretail.com' && <Check className="w-3 h-3 text-emerald-600" />}
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 truncate">Cashier Role</span>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 text-center">
          <p className="text-xs text-slate-500">
            Need a new organization?{' '}
            <Link to="/register" className="font-semibold text-slate-900 hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        Secured with bcrypt cost 12 hashing & JWT session authentication
      </p>
    </div>
  );
};
