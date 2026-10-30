import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { POSPage } from '../pages/pos/POSPage.jsx';
import { InvoicesPage } from '../pages/invoices/InvoicesPage.jsx';
import { CustomersPage } from '../pages/customers/CustomersPage.jsx';
import { EmployeesPage } from '../pages/employees/EmployeesPage.jsx';
import { ExpensesPage } from '../pages/expenses/ExpensesPage.jsx';
import { ReportsPage } from '../pages/reports/ReportsPage.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { NotificationProvider } from '../context/NotificationContext.jsx';
import {
  productService,
  customerService,
  saleService,
  employeeService,
  expenseService,
  reportService
} from '../services/businessServices.js';

vi.mock('../services/businessServices.js', () => ({
  productService: {
    list: vi.fn(),
    listCategories: vi.fn()
  },
  customerService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  saleService: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    addPayment: vi.fn(),
    refund: vi.fn()
  },
  employeeService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    recordAttendance: vi.fn(),
    recordSalary: vi.fn()
  },
  expenseService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  reportService: {
    getDashboard: vi.fn(),
    getProfitLoss: vi.fn(),
    getSalesSummary: vi.fn(),
    getInventory: vi.fn(),
    exportCsvUrl: vi.fn()
  }
}));

describe('BUSINESSFLOW — Stages 5–8 Frontend Operations & Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'mock_token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'Sarah Connor',
        role: 'ADMIN',
        business: { name: 'Apex Retail Solutions', currency_symbol: '$', state: 'California' }
      })
    );

    productService.listCategories.mockResolvedValue({
      data: { categories: [{ id: 1, name: 'Hardware' }] }
    });

    productService.list.mockResolvedValue({
      data: {
        products: [
          {
            id: 101,
            name: 'Laser Barcode Scanner',
            sku: 'SKU-SCAN-01',
            selling_price: '75.00',
            quantity: 10,
            tax_rate: '10'
          }
        ]
      }
    });

    customerService.list.mockResolvedValue({
      data: {
        customers: [
          {
            id: 201,
            name: 'Cyberdyne Systems',
            phone: '+1-555-123-4567',
            outstanding_balance: '150.00'
          }
        ]
      },
      meta: { total: 1, totalPages: 1 }
    });

    saleService.list.mockResolvedValue({
      data: {
        sales: [
          {
            id: 301,
            invoice_number: 'INV-20260510-0001',
            invoice_date: '2026-05-10',
            grand_total: '165.00',
            paid_amount: '165.00',
            balance_due: '0.00',
            payment_status: 'PAID',
            status: 'COMPLETED',
            customer: { name: 'Cyberdyne Systems' }
          }
        ]
      },
      meta: { total: 1, totalPages: 1 }
    });

    saleService.getById.mockResolvedValue({
      data: {
        sale: {
          id: 301,
          invoice_number: 'INV-20260510-0001',
          invoice_date: '2026-05-10',
          subtotal: '150.00',
          tax_total: '15.00',
          cgst_total: '7.50',
          sgst_total: '7.50',
          grand_total: '165.00',
          paid_amount: '165.00',
          balance_due: '0.00',
          payment_status: 'PAID',
          status: 'COMPLETED',
          customer: { name: 'Cyberdyne Systems', phone: '+1-555-123-4567' },
          items: [
            {
              id: 501,
              product_name: 'Laser Barcode Scanner',
              product_sku: 'SKU-SCAN-01',
              quantity: 2,
              unit_selling_price: '75.00',
              tax_rate: '10',
              line_total: '165.00'
            }
          ],
          payments: [
            { id: 601, payment_method: 'CASH', amount: '165.00', payment_date: '2026-05-10' }
          ]
        }
      }
    });

    employeeService.list.mockResolvedValue({
      data: {
        employees: [
          {
            id: 401,
            name: 'John Connor',
            first_name: 'John',
            last_name: 'Connor',
            designation: 'Store Manager',
            department: 'Operations',
            salary_amount: '4500.00',
            user: { role: 'MANAGER', is_active: true }
          }
        ]
      }
    });

    expenseService.list.mockResolvedValue({
      data: {
        expenses: [
          {
            id: 701,
            description: 'Warehouse Utilities',
            amount: '220.00',
            category: 'Utilities',
            expense_date: '2026-05-01',
            payment_method: 'BANK_TRANSFER'
          }
        ]
      },
      meta: { total: 1, totalPages: 1 }
    });

    reportService.getDashboard.mockResolvedValue({
      data: {
        summary: {
          totalRevenue: 12500,
          grossProfit: 5500,
          totalExpenses: 2100,
          netOperatingProfit: 3400,
          transactionsCount: 45
        },
        salesTrend: [
          { label: 'May 1', sales: 1200, orders: 5 },
          { label: 'May 2', sales: 1800, orders: 8 }
        ]
      }
    });
  });

  const renderWithProviders = (ui) =>
    render(
      <MemoryRouter>
        <AuthProvider>
          <NotificationProvider>{ui}</NotificationProvider>
        </AuthProvider>
      </MemoryRouter>
    );

  it('POSPage: renders catalog and adds item to cart', async () => {
    renderWithProviders(<POSPage />);

    expect(await screen.findByText('Laser Barcode Scanner')).toBeInTheDocument();
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();

    // Click item to add to cart
    fireEvent.click(screen.getByText('Laser Barcode Scanner'));

    // Cart should now contain item
    await waitFor(() => {
      expect(screen.queryByText(/cart is empty/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /complete sale/i })).toBeInTheDocument();
    });
  });

  it('InvoicesPage: renders invoice ledger and displays items and statuses', async () => {
    renderWithProviders(<InvoicesPage />);

    expect(await screen.findByText('INV-20260510-0001')).toBeInTheDocument();
    expect(screen.getByText('Cyberdyne Systems')).toBeInTheDocument();
    expect(screen.getAllByText(/165\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('CustomersPage: lists customers and opens create modal', async () => {
    renderWithProviders(<CustomersPage />);

    expect(await screen.findByText('Cyberdyne Systems')).toBeInTheDocument();
    expect(screen.getByText(/150\.00/)).toBeInTheDocument();

    // Click Add Customer
    fireEvent.click(screen.getByText(/add customer/i));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/customer name/i)).toBeInTheDocument();
    });
  });

  it('EmployeesPage: lists employees with badges and details', async () => {
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    expect(screen.getByText('Store Manager')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('EmployeesPage: opens Add Employee modal without password/login fields', async () => {
    employeeService.create.mockResolvedValue({
      data: { employee: { id: 301, name: 'Kyle Reese', designation: 'Security' } }
    });
    renderWithProviders(<EmployeesPage />);

    fireEvent.click(screen.getByRole('button', { name: /add employee/i }));

    expect(await screen.findByPlaceholderText(/e\.g\. John Doe/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Senior Cashier/i)).toBeInTheDocument();
    // Must NOT have password fields or login credentials
    expect(screen.queryByPlaceholderText(/login password/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it('EmployeesPage: opens View Employee Details modal', async () => {
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(await screen.findByText('Employee Details')).toBeInTheDocument();
    expect(screen.getAllByText('Store Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operations').length).toBeGreaterThan(0);
  });

  it('EmployeesPage: opens Edit Employee Details modal', async () => {
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(await screen.findByText('Edit Employee Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Connor')).toBeInTheDocument();
    // Must NOT have password inputs
    expect(screen.queryByPlaceholderText(/login password/i)).not.toBeInTheDocument();
  });

  it('EmployeesPage: confirms employee deactivation', async () => {
    employeeService.deactivate.mockResolvedValue({
      data: { employee: { id: 401, status: 'TERMINATED' } }
    });
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Deactivate'));

    expect(await screen.findByText('Deactivate Employee')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to deactivate John Connor\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm deactivation/i }));
    await waitFor(() => {
      expect(employeeService.deactivate).toHaveBeenCalledWith(401);
    });
  });

  it('ExpensesPage: lists expenses and displays operational expenditures', async () => {
    renderWithProviders(<ExpensesPage />);

    expect(await screen.findByText('Warehouse Utilities')).toBeInTheDocument();
    expect(screen.getAllByText(/220\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Utilities').length).toBeGreaterThan(0);
  });

  it('ReportsPage: renders KPI cards and CSV export buttons', async () => {
    renderWithProviders(<ReportsPage />);

    expect(await screen.findByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Export Sales CSV')).toBeInTheDocument();
    expect(screen.getByText('Export Inventory CSV')).toBeInTheDocument();
  });
});
