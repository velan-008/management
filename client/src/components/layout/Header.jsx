import React from 'react';
import { Menu, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export const Header = ({ onOpenSidebar }) => {
  const { business } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#0B1120] border-b border-[#D4AF37]/30 flex items-center justify-between px-4 lg:px-8">
      {/* Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden text-slate-300 hover:text-[#D4AF37] p-1.5 rounded-lg hover:bg-navy-800 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full hidden sm:block">
          <Search className="w-4 h-4 text-[#D4AF37] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, invoices, or customers..."
            className="w-full text-xs bg-[#162038] border border-navy-700 rounded-lg pl-9 pr-4 py-1.5 text-white placeholder-slate-400 focus:bg-[#121A2D] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-colors"
          />
        </div>
      </div>
    </header>
  );
};
