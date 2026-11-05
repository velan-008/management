import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Tag, Layers, Award, Scale, History } from 'lucide-react';
import { ProductsPage } from './ProductsPage.jsx';
import { CategoriesPage } from './CategoriesPage.jsx';
import { SubCategoriesPage } from './SubCategoriesPage.jsx';
import { BrandsPage } from './BrandsPage.jsx';
import { UnitsPage } from './UnitsPage.jsx';
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
      {/* Tab Navigation Pill Bar (Dark Navy + Golden) */}
      <div className="flex items-center gap-1.5 p-1 bg-[#0B1120] rounded-xl w-fit border border-[#D4AF37]/40 shadow-md flex-wrap">
        <button
          type="button"
          onClick={() => setTab('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'products'
              ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#162038]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'categories'
              ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#162038]'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Categories</span>
        </button>

        <button
          type="button"
          aria-label="Sub-Types"
          onClick={() => setTab('sub-categories')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'sub-categories'
              ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#162038]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sub-Categories</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('brands')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'brands'
              ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#162038]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Brands</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('units')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'units'
              ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#162038]'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Units</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'history'
              ? 'bg-[#D4AF37] text-[#0B1120] shadow-xs'
              : 'text-slate-300 hover:text-white hover:bg-[#162038]'
          }`}
        >
          <History className="w-4 h-4" />
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

      {currentTab === 'sub-categories' && (
        <SubCategoriesPage />
      )}

      {currentTab === 'brands' && (
        <BrandsPage />
      )}

      {currentTab === 'units' && (
        <UnitsPage />
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
