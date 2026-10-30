import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductsPage } from '../pages/inventory/ProductsPage.jsx';
import { CategoriesPage } from '../pages/inventory/CategoriesPage.jsx';
import { StockHistoryPage } from '../pages/inventory/StockHistoryPage.jsx';
import { InventoryPage } from '../pages/inventory/InventoryPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { NotificationProvider } from '../context/NotificationContext.jsx';
import { productService, categoryService } from '../services/businessServices.js';

vi.mock('../services/businessServices.js', () => ({
  productService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    adjustStock: vi.fn(),
    stockMovements: vi.fn(),
    allMovements: vi.fn()
  },
  categoryService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

describe('BUSINESSFLOW — Stage 4 Products & Inventory Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'mock_token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 1, name: 'Sarah Connor', role: 'ADMIN', business: { currency_symbol: '$' } })
    );

    categoryService.list.mockResolvedValue({
      data: {
        categories: [
          { id: 1, name: 'Electronics', description: 'Gadgets', product_count: 5 },
          { id: 2, name: 'Office Supplies', description: 'Stationery', product_count: 3 }
        ]
      }
    });

    productService.list.mockResolvedValue({
      data: {
        products: [
          {
            id: 101,
            name: 'Logitech Wireless Mouse',
            sku: 'SKU-LOGI-M1',
            barcode: '097855070005',
            cost_price: '12.50',
            selling_price: '24.99',
            quantity: 45,
            low_stock_threshold: 10,
            tax_rate: '18.00',
            unit: 'pcs',
            category: { id: 1, name: 'Electronics' }
          },
          {
            id: 102,
            name: 'Hardcover Notebook A5',
            sku: 'SKU-NOTE-A5',
            barcode: '890123456789',
            cost_price: '2.20',
            selling_price: '6.50',
            quantity: 4, // low stock!
            low_stock_threshold: 20,
            tax_rate: '5.00',
            unit: 'pcs',
            category: { id: 2, name: 'Office Supplies' }
          }
        ]
      },
      meta: { total: 2, totalPages: 1, limit: 15 }
    });
  });

  const renderWithProviders = (ui) => {
    return render(
      <MemoryRouter>
        <AuthProvider>
          <NotificationProvider>
            {ui}
          </NotificationProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  // 1. ProductsPage tests
  describe('ProductsPage Component', () => {
    it('should render product list with details, prices, and stock indicators', async () => {
      renderWithProviders(<ProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Product Catalog')).toBeInTheDocument();
        expect(screen.getByText('Logitech Wireless Mouse')).toBeInTheDocument();
        expect(screen.getByText('SKU-LOGI-M1')).toBeInTheDocument();
        expect(screen.getByText('$24.99')).toBeInTheDocument();
        expect(screen.getByText('45 pcs')).toBeInTheDocument();
        expect(screen.getByText('Hardcover Notebook A5')).toBeInTheDocument();
        expect(screen.getByText(/Low \(min: 20\)/)).toBeInTheDocument();
      });
    });

    it('should open Add Product modal and submit new product', async () => {
      productService.create.mockResolvedValueOnce({
        data: { product: { id: 103, name: 'Anker USB Hub' } }
      });

      renderWithProviders(<ProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Product Catalog')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add product/i }));

      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/selling price/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/product name/i), {
        target: { value: 'Anker 4-Port USB Hub' }
      });
      fireEvent.change(screen.getByLabelText(/selling price/i), {
        target: { value: '29.99' }
      });

      fireEvent.click(screen.getByRole('button', { name: /create product/i }));

      await waitFor(() => {
        expect(productService.create).toHaveBeenCalled();
      });
    });

    it('should open Adjust Stock modal and submit quantity change', async () => {
      productService.adjustStock.mockResolvedValueOnce({
        data: { product: { id: 101, quantity: 55 } }
      });

      renderWithProviders(<ProductsPage />);

      await waitFor(() => {
        expect(screen.getByText('Logitech Wireless Mouse')).toBeInTheDocument();
      });

      const adjustButtons = screen.getAllByTitle(/adjust stock/i);
      fireEvent.click(adjustButtons[0]);

      expect(screen.getByText(/Adjust Stock: Logitech Wireless Mouse/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/quantity change/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/quantity change/i), {
        target: { value: '10' }
      });

      fireEvent.click(screen.getByRole('button', { name: /confirm adjustment/i }));

      await waitFor(() => {
        expect(productService.adjustStock).toHaveBeenCalledWith(
          101,
          expect.objectContaining({ quantity_change: 10 })
        );
      });
    });
  });

  // 2. CategoriesPage tests
  describe('CategoriesPage Component', () => {
    it('should render categories list with active product count', async () => {
      renderWithProviders(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Product Categories')).toBeInTheDocument();
        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('5 items')).toBeInTheDocument();
        expect(screen.getByText('Office Supplies')).toBeInTheDocument();
        expect(screen.getByText('3 items')).toBeInTheDocument();
      });
    });

    it('should open Add Category modal and submit', async () => {
      categoryService.create.mockResolvedValueOnce({
        data: { category: { id: 3, name: 'Home Appliances' } }
      });

      renderWithProviders(<CategoriesPage />);

      await waitFor(() => {
        expect(screen.getByText('Product Categories')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add category/i }));

      expect(screen.getByText('Add New Category')).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/category name/i), {
        target: { value: 'Home Appliances' }
      });

      fireEvent.click(screen.getByRole('button', { name: /create category/i }));

      await waitFor(() => {
        expect(categoryService.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Home Appliances' })
        );
      });
    });
  });

  // 3. StockHistoryPage tests
  describe('StockHistoryPage Component', () => {
    it('should render stock movement ledger', async () => {
      productService.allMovements.mockResolvedValueOnce({
        data: {
          movements: [
            {
              id: 1,
              created_at: '2026-10-25T14:30:00Z',
              type: 'PURCHASE',
              quantity_change: 25,
              previous_quantity: 0,
              new_quantity: 25,
              reference_id: 'PO-9001',
              notes: 'Initial opening restock',
              product: { name: 'Logitech Wireless Mouse', sku: 'SKU-LOGI-M1' },
              user: { name: 'Sarah Connor' }
            }
          ]
        },
        meta: { total: 1, totalPages: 1, limit: 20 }
      });

      renderWithProviders(<StockHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText(/Stock Movement History & Audit Ledger/i)).toBeInTheDocument();
        expect(screen.getByText('Logitech Wireless Mouse')).toBeInTheDocument();
        expect(screen.getByText('+25')).toBeInTheDocument();
        expect(screen.getByText('PO-9001')).toBeInTheDocument();
        expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      });
    });
  });

  // 4. InventoryPage Tabbed Navigation tests
  describe('InventoryPage Master Container', () => {
    it('should switch between Products, Categories, and Movement History tabs', async () => {
      productService.allMovements.mockResolvedValue({
        data: { movements: [] },
        meta: { total: 0, totalPages: 1, limit: 20 }
      });

      renderWithProviders(<InventoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Product Catalog')).toBeInTheDocument();
      });

      // Switch to Categories tab
      fireEvent.click(screen.getByRole('button', { name: /categories/i }));
      await waitFor(() => {
        expect(screen.getByText('Product Categories')).toBeInTheDocument();
      });

      // Switch to Movement History tab
      fireEvent.click(screen.getByRole('button', { name: /movement history/i }));
      await waitFor(() => {
        expect(screen.getByText(/Stock Movement History & Audit Ledger/i)).toBeInTheDocument();
      });
    });
  });
});
