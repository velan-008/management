import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Tag, History } from 'lucide-react';
import { ProductsPage } from './ProductsPage.jsx';
import { CategoriesPage } from './CategoriesPage.jsx';
import { StockHistoryPage } from './StockHistoryPage.jsx';

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'products';
  const initialProductId = searchParams.get('productId') || '';

  const setTab = (tabName, extraParams = {}) => {
    const params = new URLSearchParams();
    params.set('tab', tabName);
    Object.entries(extraParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleNavigateToHistory = (productId) => {
    setTab('history', { productId: productId || '' });
  };

  const handleFilterProductsByCategory = (categoryId) => {
    setTab('products', { category: categoryId });
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-fit border border-slate-300/60 shadow-inner">
        <button
          type="button"
          onClick={() => setTab('products')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'products'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Package className="w-4 h-4 text-slate-500" />
          <span>Products & Stock</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'categories'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Tag className="w-4 h-4 text-slate-500" />
          <span>Categories</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'history'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Movement History</span>
        </button>
      </div>

      {/* Tab Views */}
      {currentTab === 'products' && (
        <ProductsPage onNavigateToHistory={handleNavigateToHistory} />
      )}

      {currentTab === 'categories' && (
        <CategoriesPage onFilterProductsByCategory={handleFilterProductsByCategory} />
      )}

      {currentTab === 'history' && (
        <StockHistoryPage
          initialProductId={initialProductId}
          onBackToProducts={() => setTab('products')}
        />
      )}
    </div>
  );
}
export default InventoryPage;
