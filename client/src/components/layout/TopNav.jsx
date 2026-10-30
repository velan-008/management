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
  Layers,
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles,
  Menu,
  X,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { Badge } from '../ui/Badge.jsx';

export const TopNav = ({ onOpenMobileMenu }) => {
  const { user, business, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const inventoryRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (inventoryRef.current && !inventoryRef.current.contains(e.target)) {
        setInventoryOpen(false);
      }
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

  // Admin modules
  const adminLinks = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    {
      name: 'Inventory',
      to: '/inventory',
      icon: Package,
      hasDropdown: true,
      subItems: [
        { name: 'All Products', to: '/inventory' },
        { name: 'Categories', to: '/inventory' },
        { name: 'Stock Movement', to: '/inventory' }
      ]
    },
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

  // Staff modules
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
    <div className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shadow-xs">
      {/* 1. Primary Header Row */}
      <div className="h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
        {/* Left: Brand Logo, Shop Name & Role Badge */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="xl:hidden p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open mobile navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm shrink-0 group-hover:bg-indigo-600 transition-colors">
              BF
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-none truncate">
                  BUSINESSFLOW
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Wholesale
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 font-medium truncate">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{business?.name || 'Apex Retail Solutions'}</span>
              </div>
            </div>
          </Link>

          {/* Role Badge */}
          <div className="ml-1 sm:ml-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-white shadow-xs">
                <Shield className="w-3 h-3 text-indigo-400" />
                Admin Panel
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <User className="w-3 h-3 text-emerald-600" />
                Staff Panel
              </span>
            )}
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wholesale products, barcodes, bills, suppliers..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-8 py-1.5 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* Right Header Status & Tools */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Currency indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              <strong className="text-slate-900 dark:text-white">
                {business?.currency_code || 'USD'} ({business?.currency_symbol || '$'})
              </strong>
            </span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700 font-semibold text-slate-900 dark:text-white">
                  <span>Wholesale Alerts</span>
                  <span className="text-[10px] text-slate-400 font-normal">Real-time</span>
                </div>
                <div className="py-2 space-y-2">
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-semibold">Stock Reorder Alerts</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">Some products are below minimum thresholds.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
                    <div>
                      <p className="font-semibold">Wholesale Operations Active</p>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-400">Ready to bill customer orders & receive shipments.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 uppercase font-medium tracking-wider">
                  {user?.role || 'STAFF'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{user?.email}</p>
                  <div className="mt-1">
                    <Badge variant={isAdmin ? 'primary' : 'success'}>
                      {isAdmin ? 'Administrator' : 'Staff Member'}
                    </Badge>
                  </div>
                </div>

                <div className="py-1">
                  {isAdmin && (
                    <Link
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      Shop Settings
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left font-medium"
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
      <nav className="hidden xl:flex items-center px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar gap-1 py-1 bg-slate-50/70 dark:bg-slate-900/90 text-xs font-medium">
        {links.map((item) => {
          return (
            <NavLink
              key={item.name}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

