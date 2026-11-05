import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav.jsx';
import { Sidebar } from './Sidebar.jsx';

export const AppLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isPosRoute = location.pathname === '/pos' || location.pathname.startsWith('/pos');

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#0B1120] flex flex-col transition-colors overflow-x-hidden">
      {/* Enterprise Dark Navy + Golden Top Navigation */}
      <div className="no-print">
        <TopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />
      </div>

      {/* Responsive Mobile Drawer Navigation */}
      <div className="no-print">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      </div>

      {/* Main Application Content Container */}
      <main
        className={`flex-1 w-full transition-all duration-150 ${
          isPosRoute
            ? 'max-w-none px-2 sm:px-4 lg:px-6 py-3'
            : 'max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
};
