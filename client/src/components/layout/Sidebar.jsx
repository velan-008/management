import React, { useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  UserCheck,
  ReceiptText,
  BarChart3,
  Settings,
  LogOut,
  Building2,
  Truck,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge } from '../ui/Badge.jsx';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, business, logout, isAdmin } = useAuth();

  // Close on Escape key press
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const navigation = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Inventory & Products', to: '/inventory', icon: Package },
    { name: 'Purchases', to: '/purchases', icon: Truck, adminOnly: true },
    { name: 'POS & Billing', to: '/pos', icon: ShoppingCart },
    { name: 'Invoices & Sales', to: '/invoices', icon: Receipt },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Suppliers', to: '/suppliers', icon: Building2, adminOnly: true },
    { name: 'Employees & HR', to: '/employees', icon: UserCheck, adminOnly: true },
    { name: 'Expenses', to: '/expenses', icon: ReceiptText },
    { name: 'Financial Reports', to: '/reports', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings, adminOnly: true }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#0B1120]/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Sidebar Drawer Container */}
      <aside
        role="dialog"
        aria-label="Navigation drawer"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B1120] border-r border-[#D4AF37]/30 flex flex-col transition-transform duration-200 ease-in-out shadow-2xl select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Business Header */}
        <div className="p-4 border-b border-navy-800 flex items-center justify-between bg-[#111A2E] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B89326] text-[#0B1120] flex items-center justify-center font-extrabold text-sm tracking-tight shadow-gold shrink-0">
              BF
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight leading-none truncate">
                BUSINESSFLOW
              </h1>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-[#D4AF37] font-medium truncate">
                <Building2 className="w-3 h-3 text-[#D4AF37] shrink-0" />
                <span className="truncate">{business?.name || 'Wholesale Distribution'}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-navy-800 p-1.5 rounded-lg transition-colors shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links List */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (item.adminOnly && !isAdmin && user?.role !== 'MANAGER') return null;

            return (
              <NavLink
                key={item.name}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#D4AF37] text-[#0B1120] font-bold shadow-xs'
                      : 'text-slate-300 hover:text-[#D4AF37] hover:bg-navy-800'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Drawer Footer */}
        <div className="p-3 border-t border-navy-800 bg-[#111A2E] shrink-0">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#162038] border border-[#D4AF37]/20">
            <div className="min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37] text-[#0B1120] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-none">
                  {user?.name || 'Staff User'}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant={user?.role === 'ADMIN' ? 'gold' : 'neutral'}>
                    {user?.role === 'ADMIN' ? (
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Admin
                      </span>
                    ) : (
                      'Staff'
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 p-2 rounded-md transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
