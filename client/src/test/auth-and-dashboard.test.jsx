import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage.jsx';
import { DashboardPage } from '../pages/dashboard/DashboardPage.jsx';
import { ProtectedRoute } from '../components/layout/ProtectedRoute.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { NotificationProvider } from '../context/NotificationContext.jsx';
import { RegisterPage } from '../pages/auth/RegisterPage.jsx';
import { authService } from '../services/authService.js';
import { dashboardService } from '../services/dashboardService.js';
import { Select } from '../components/ui/Select.jsx';
import { ConfirmationModal } from '../components/ui/ConfirmationModal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';

// Mock services
vi.mock('../services/authService.js', () => ({
  authService: {
    login: vi.fn(),
    getMe: vi.fn(),
    logout: vi.fn(),
    register: vi.fn()
  }
}));

vi.mock('../services/dashboardService.js', () => ({
  dashboardService: {
    getMetrics: vi.fn()
  }
}));

describe('BUSINESSFLOW — Stage 3 Frontend Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // 1. Login Form Validation & Interaction
  describe('LoginPage Component', () => {
    it('should render email and password inputs with demo credentials toggle', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/Test Credentials/i)).toBeInTheDocument();
    });

    it('should show error when submitting empty fields', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const form = screen.getByRole('button', { name: /sign in/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
      });
    });

    it('should call authService.login on valid submission', async () => {
      authService.login.mockResolvedValueOnce({
        token: 'mock_jwt_token',
        user: { id: 1, name: 'Sarah Connor', email: 'admin@apexretail.com', role: 'ADMIN' }
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/work email/i), {
        target: { value: 'admin@apexretail.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'Admin@123456' }
      });

      const form = screen.getByRole('button', { name: /sign in/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith('admin@apexretail.com', 'Admin@123456');
      });
    });

    it('should display error message on failed login attempt', async () => {
      authService.login.mockRejectedValueOnce(new Error('Invalid email or password'));

      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/work email/i), {
        target: { value: 'admin@apexretail.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'WrongPassword' }
      });

      const form = screen.getByRole('button', { name: /sign in/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });
  });

  // 2. Protected Routes Guard
  describe('ProtectedRoute Guard', () => {
    it('should redirect unauthenticated users to /login', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Login Page Screen</div>} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <div>Protected Dashboard Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
      expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
    });

    it('should block non-admin users from admin-only routes', async () => {
      localStorage.setItem('token', 'mock_staff_token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 2, name: 'John Doe', email: 'staff@apexretail.com', role: 'STAFF' })
      );
      authService.getMe.mockResolvedValueOnce({
        user: { id: 2, name: 'John Doe', email: 'staff@apexretail.com', role: 'STAFF' },
        business: { id: 1, name: 'Apex Retail' }
      });

      render(
        <MemoryRouter initialEntries={['/admin-settings']}>
          <AuthProvider>
            <Routes>
              <Route
                path="/admin-settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <div>Secret Admin Settings</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
        expect(screen.queryByText('Secret Admin Settings')).not.toBeInTheDocument();
      });
    });
  });

  // 3. Dashboard Metrics & Empty States
  describe('DashboardPage Component', () => {
    it('should render live metrics when backend data is loaded', async () => {
      localStorage.setItem('token', 'mock_token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, name: 'Sarah Connor', email: 'admin@apexretail.com', role: 'ADMIN' })
      );
      authService.getMe.mockResolvedValueOnce({
        user: { id: 1, name: 'Sarah Connor', role: 'ADMIN' },
        business: { id: 1, name: 'Apex Retail Solutions', currency_symbol: '$' }
      });

      dashboardService.getMetrics.mockResolvedValueOnce({
        success: true,
        data: {
          summary: {
            totalRevenue: 121.98,
            transactionsCount: 2,
            totalExpenses: 117.50,
            grossProfit: 60.00,
            netOperatingProfit: -57.50,
            lowStockCount: 1
          },
          salesTrend: [
            { date: '2026-10-25', label: 'Oct 25', sales: 63.00, orders: 1 }
          ],
          recentTransactions: [
            {
              id: 1,
              invoiceNumber: 'INV-2026-0001',
              invoiceDate: '2026-10-23',
              customerName: 'Acme Corporation',
              cashierName: 'John Doe',
              grandTotal: 58.98,
              paymentStatus: 'PAID'
            }
          ],
          lowStockAlerts: [
            { id: 3, name: 'Anker USB Hub', sku: 'SKU-USB-HUB4', quantity: 3, threshold: 10, unit: 'pcs' }
          ]
        }
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <NotificationProvider>
              <DashboardPage />
            </NotificationProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Business Overview')).toBeInTheDocument();
        expect(screen.getByText('$121.98')).toBeInTheDocument();
        expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
        expect(screen.getByText('Anker USB Hub')).toBeInTheDocument();
      });
    });

    it('should display error banner with retry option if API fails', async () => {
      localStorage.setItem('token', 'mock_token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, name: 'Sarah Connor', role: 'ADMIN' })
      );
      authService.getMe.mockResolvedValueOnce({
        user: { id: 1, name: 'Sarah Connor', role: 'ADMIN' },
        business: { id: 1, name: 'Apex Retail Solutions' }
      });

      dashboardService.getMetrics.mockRejectedValueOnce(new Error('Network connection timeout'));

      render(
        <MemoryRouter>
          <AuthProvider>
            <NotificationProvider>
              <DashboardPage />
            </NotificationProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Unable to load dashboard data/i)).toBeInTheDocument();
        expect(screen.getByText(/Network connection timeout/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  // 4. RegisterPage Onboarding
  describe('RegisterPage Component', () => {
    it('should render registration fields properly', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business contact email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/admin full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/admin login email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register organization/i })).toBeInTheDocument();
    });

    it('should validate required fields before submission', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const form = screen.getByRole('button', { name: /register organization/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
      });
    });

    it('should submit registration with authService.register', async () => {
      authService.register.mockResolvedValueOnce({
        token: 'new_token',
        user: { id: 3, name: 'Alice Walker', role: 'ADMIN' }
      });

      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/organization name/i), {
        target: { value: 'Delta Retail' }
      });
      fireEvent.change(screen.getByLabelText(/business contact email/i), {
        target: { value: 'info@deltaretail.com' }
      });
      fireEvent.change(screen.getByLabelText(/admin full name/i), {
        target: { value: 'Alice Walker' }
      });
      fireEvent.change(screen.getByLabelText(/admin login email/i), {
        target: { value: 'alice@deltaretail.com' }
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: 'DeltaSecure@2026' }
      });

      const form = screen.getByRole('button', { name: /register organization/i }).closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(authService.register).toHaveBeenCalled();
      });
    });
  });

  // 5. Sidebar & Navigation Interaction
  describe('Sidebar Navigation', () => {
    it('should render navigation links and trigger logout', async () => {
      localStorage.setItem('token', 'mock_token');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, name: 'Sarah Connor', role: 'ADMIN' })
      );

      render(
        <MemoryRouter>
          <AuthProvider>
            <Sidebar isOpen={true} onClose={vi.fn()} />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('BUSINESSFLOW')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Inventory & Products')).toBeInTheDocument();
      expect(screen.getByText('POS & Billing')).toBeInTheDocument();

      const logoutBtn = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(authService.logout).toHaveBeenCalled();
      });
    });
  });

  // 6. UI Components
  describe('UI Design System Components', () => {
    it('should render Select with options', () => {
      const handleChange = vi.fn();
      render(
        <Select
          label="Category"
          id="category"
          options={[
            { value: 'cat1', label: 'Electronics' },
            { value: 'cat2', label: 'Apparel' }
          ]}
          onChange={handleChange}
        />
      );

      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Apparel')).toBeInTheDocument();
    });

    it('should render ConfirmationModal and trigger actions', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <ConfirmationModal
          isOpen={true}
          title="Delete Product"
          message="Are you sure you want to delete this item?"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Delete Product')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      expect(onConfirm).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalled();
    });

    it('should render Table with custom data and columns', () => {
      const columns = [
        { key: 'name', title: 'Product Name' },
        { key: 'price', title: 'Price', render: (val) => `$${val}` }
      ];
      const data = [{ id: 1, name: 'Keyboard', price: '49.99' }];

      render(<Table columns={columns} data={data} />);

      expect(screen.getByText('Product Name')).toBeInTheDocument();
      expect(screen.getByText('Keyboard')).toBeInTheDocument();
      expect(screen.getByText('$49.99')).toBeInTheDocument();
    });

    it('should render Pagination controls', () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={3}
          totalItems={30}
          pageSize={10}
          onPageChange={onPageChange}
        />
      );

      expect(screen.getByText(/Showing/)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /next/i });
      fireEvent.click(nextBtn);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });
  });
});
