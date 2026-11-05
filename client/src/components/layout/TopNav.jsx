import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  Users,
  Building2,
  ReceiptText,
  BarChart3,
  Settings,
  Truck,
  UserCheck,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Search,
  Bell,
  Menu,
  X,
  AlertTriangle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge } from '../ui/Badge.jsx';

export const TopNav = ({ onOpenMobileMenu }) => {
  const { user, business, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close popovers on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/login');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/inventory?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Admin navigation items
  const adminLinks = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Inventory', to: '/inventory', icon: Package },
    { name: 'Purchases', to: '/purchases', icon: Truck },
    { name: 'POS & Billing', to: '/pos', icon: ShoppingCart },
    { name: 'Sales', to: '/invoices', icon: Receipt },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Suppliers', to: '/suppliers', icon: Building2 },
    { name: 'Expenses', to: '/expenses', icon: ReceiptText },
    { name: 'Reports', to: '/reports', icon: BarChart3 },
    { name: 'Staff & HR', to: '/employees', icon: UserCheck },
    { name: 'Settings', to: '/settings', icon: Settings }
  ];

  // Staff navigation items
  const staffLinks = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'POS & Billing', to: '/pos', icon: ShoppingCart },
    { name: 'Invoices', to: '/invoices', icon: Receipt },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Expenses', to: '/expenses', icon: ReceiptText },
    { name: 'Inventory Lookup', to: '/inventory', icon: Package }
  ];

  const links = isAdmin ? adminLinks : staffLinks;

  return (
    <header className="sticky top-0 z-40 bg-[#0B1120] border-b border-[#D4AF37]/30 shadow-md select-none">
      {/* 1. Primary Header Row (Dark Navy & Gold) */}
      <div className="h-14 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 border-b border-navy-800">
        {/* Left: Hamburger trigger, Brand Logo & Business Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="xl:hidden p-2 text-slate-300 hover:text-[#D4AF37] rounded-lg hover:bg-navy-800 transition-colors shrink-0"
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#B89326] text-[#0B1120] flex items-center justify-center font-extrabold text-sm tracking-tight shadow-gold shrink-0 transition-transform group-hover:scale-105">
              BF
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight leading-none truncate group-hover:text-[#D4AF37] transition-colors">
                  BUSINESSFLOW
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-navy-800 text-[#D4AF37] border border-[#D4AF37]/30 shrink-0">
                  Wholesale POS
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-300 font-medium truncate">
                <Building2 className="w-3 h-3 text-[#D4AF37] shrink-0" />
                <span className="truncate">{business?.name || 'Wholesale Distribution'}</span>
              </div>
            </div>
          </Link>

          {/* Role Badge */}
          <div className="ml-1 hidden md:block">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF5E8] text-[#917118] border border-[#D4AF37]/40 shadow-xs">
                <Shield className="w-3 h-3 text-[#B89326]" />
                Admin Panel
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                <User className="w-3 h-3 text-emerald-400" />
                Staff Panel
              </span>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wholesale products, barcodes, bills, suppliers..."
              className="w-full text-xs bg-[#162038] border border-navy-700 rounded-lg pl-9 pr-8 py-2 text-white placeholder-slate-400 focus:bg-[#121A2D] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 text-xs transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Right Header Status & Tools */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Wholesale Alerts Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-[#D4AF37] hover:bg-navy-800 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-[#0B1120]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#D4AF37]/40 rounded-xl shadow-popup p-3.5 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 font-bold text-[#0B1120]">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Wholesale Notifications</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">Real-time</span>
                </div>
                <div className="py-2 space-y-2">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Stock Reorder Alerts</p>
                      <p className="text-[11px] text-amber-700 leading-snug mt-0.5">
                        Products nearing minimum inventory thresholds.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#FAF5E8] text-[#6E5513] border border-[#D4AF37]/30">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[#B89326]" />
                    <div>
                      <p className="font-bold">Wholesale Operations Active</p>
                      <p className="text-[11px] text-[#917118] leading-snug mt-0.5">
                        Ready to process orders, dispatch packs, and accept split payments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-navy-800 transition-colors text-left"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 rounded-full bg-[#D4AF37] text-[#0B1120] font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-semibold text-white leading-tight truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-[#D4AF37] uppercase font-bold tracking-wider">
                  {user?.role || 'STAFF'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white border border-[#D4AF37]/40 rounded-xl shadow-popup py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-[#FAF5E8]/40">
                  <p className="font-bold text-[#0B1120] truncate">{user?.name}</p>
                  <p className="text-slate-500 text-[11px] truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <Badge variant={isAdmin ? 'navy' : 'success'}>
                      {isAdmin ? 'Administrator' : 'Staff Member'}
                    </Badge>
                  </div>
                </div>

                <div className="py-1">
                  {isAdmin && (
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 hover:bg-[#FAF5E8] hover:text-[#0B1120] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Shop Settings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-left font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Secondary Horizontal Navigation Bar (Module Tabs) */}
      <nav className="hidden xl:flex items-center px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar gap-1 py-1.5 bg-[#111A2E] text-xs font-medium">
        {links.map((item) => {
          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#D4AF37] text-[#0B1120] font-bold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
};
