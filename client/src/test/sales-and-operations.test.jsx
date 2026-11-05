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
  invoiceService,
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
  invoiceService: {
    create: vi.fn().mockResolvedValue({
      data: {
        invoice: {
          id: 1,
          invoice_number: 'INV-2026-0001',
          items: [],
          payments: []
        }
      }
    })
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
    exportCsvUrl: vi.fn(),
    exportCsv: vi.fn(),
    downloadCsv: vi.fn().mockResolvedValue(true)
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

  it('POSPage: enforces customer selection and updates unit rates on Wholesale vs Retail tier change', async () => {
    productService.list.mockResolvedValue({
      data: {
        products: [
          {
            id: 101,
            name: 'Laser Barcode Scanner',
            sku: 'SKU-SCAN-01',
            selling_price: '100.00',
            wholesale_price: '80.00',
            quantity: 10,
            tax_rate: '0'
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
            customer_type: 'WHOLESALE',
            outstanding_balance: '0.00'
          },
          {
            id: 202,
            name: 'Alice Retail',
            phone: '+1-555-987-6543',
            customer_type: 'RETAIL',
            outstanding_balance: '0.00'
          }
        ]
      }
    });

    renderWithProviders(<POSPage />);

    expect(await screen.findByText('Laser Barcode Scanner')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Laser Barcode Scanner'));

    await waitFor(() => {
      expect(screen.queryByText(/cart is empty/i)).not.toBeInTheDocument();
    });

    // Select Wholesale customer
    const customerInput = screen.getByPlaceholderText(/search customer/i);
    fireEvent.focus(customerInput);
    const customerOption = await screen.findByRole('button', { name: /cyberdyne systems/i });
    fireEvent.click(customerOption);

    // Rate should be wholesale price (BOX of 12 @ 80 = 960)
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.some(i => i.value === '960' || i.value === '960.00')).toBe(true);
    });

    // Manually switch to Retail Tier (BOX of 12 @ 100 = 1200)
    fireEvent.click(screen.getByRole('button', { name: /retail tier/i }));
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.some(i => i.value === '1200' || i.value === '1200.00')).toBe(true);
    });

    // Manually switch back to Wholesale Tier
    fireEvent.click(screen.getByRole('button', { name: /wholesale tier/i }));
    await waitFor(() => {
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.some(i => i.value === '960' || i.value === '960.00')).toBe(true);
    });

    // Clearing customer allows completing sale as walk-in customer without requiring customer selection
    invoiceService.create.mockResolvedValueOnce({
      data: {
        invoice: {
          id: 99,
          invoice_number: 'INV-WALKIN-001',
          customer_id: null,
          grand_total: '960.00',
          paid_amount: '960.00',
          payment_mode: 'CASH',
          items: [],
          payments: [{ payment_method: 'CASH', amount: '960.00' }]
        }
      }
    });
    fireEvent.click(screen.getByTitle('Clear Customer'));
    fireEvent.click(screen.getByRole('button', { name: /complete sale/i }));
    await waitFor(() => {
      expect(invoiceService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: null
        })
      );
    });
  });

  it('InvoicesPage: renders invoice ledger and triggers authenticated CSV export', async () => {
    renderWithProviders(<InvoicesPage />);

    expect(await screen.findByText('INV-20260510-0001')).toBeInTheDocument();
    expect(screen.getByText('Cyberdyne Systems')).toBeInTheDocument();
    expect(screen.getAllByText(/165\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // Trigger CSV export
    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);
    await waitFor(() => {
      expect(reportService.downloadCsv).toHaveBeenCalledWith('sales', expect.stringContaining('sales-invoices-'));
    });
  });

  it('InvoicesPage: opens Invoice Details modal and displays structured invoice with print support', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { unmount } = renderWithProviders(<InvoicesPage />);

    expect(await screen.findByText('INV-20260510-0001')).toBeInTheDocument();

    // Click the View (Eye) button
    const viewButtons = screen.getAllByRole('button');
    const eyeBtn = viewButtons.find(b => b.querySelector('svg.lucide-eye'));
    expect(eyeBtn).toBeDefined();
    fireEvent.click(eyeBtn);

    // Modal opens and shows professional invoice details
    expect(await screen.findByText('Laser Barcode Scanner')).toBeInTheDocument();
    expect(screen.getByText('SKU-SCAN-01')).toBeInTheDocument();
    expect(screen.getAllByText('Cyberdyne Systems').length).toBeGreaterThan(1);
    expect(screen.getByText('A4 Tax Invoice')).toBeInTheDocument();
    expect(screen.getByText('Print Invoice')).toBeInTheDocument();

    // Click Print button
    fireEvent.click(screen.getByText('Print Invoice'));
    await waitFor(() => {
      expect(printSpy).toHaveBeenCalled();
    });
    document.getElementById('invoice-print-direct-container')?.remove();
    document.getElementById('print-page-style')?.remove();
    unmount();
    printSpy.mockRestore();
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
    const { unmount } = renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /view/i }));

    expect(await screen.findByText('Employee Details')).toBeInTheDocument();
    expect(screen.getAllByText('Store Manager').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operations').length).toBeGreaterThan(0);
    unmount();
  });

  it('EmployeesPage: opens Edit Employee Details modal', async () => {
    const { unmount } = renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));

    expect(await screen.findByText('Edit Employee Details')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Connor')).toBeInTheDocument();
    // Must NOT have password inputs
    expect(screen.queryByPlaceholderText(/login password/i)).not.toBeInTheDocument();
    unmount();
  });

  it('EmployeesPage: confirms employee deactivation', async () => {
    employeeService.deactivate.mockResolvedValue({
      data: { employee: { id: 401, status: 'TERMINATED' } }
    });
    renderWithProviders(<EmployeesPage />);

    expect(await screen.findByText('John Connor')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Deactivate'));

    expect(await screen.findByText('Deactivate Employee', {}, { timeout: 3000 })).toBeInTheDocument();
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

  it('ReportsPage: renders KPI cards and CSV export buttons and triggers exports', async () => {
    renderWithProviders(<ReportsPage />);

    expect(await screen.findByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Gross Profit')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Export Sales CSV')).toBeInTheDocument();
    expect(screen.getByText('Export Inventory CSV')).toBeInTheDocument();

    // Trigger Sales Export
    fireEvent.click(screen.getByRole('button', { name: /export sales csv/i }));
    await waitFor(() => {
      expect(reportService.downloadCsv).toHaveBeenCalledWith('sales', expect.stringContaining('sales-report-'));
    });

    // Trigger Inventory Export
    fireEvent.click(screen.getByRole('button', { name: /export inventory csv/i }));
    await waitFor(() => {
      expect(reportService.downloadCsv).toHaveBeenCalledWith('products', expect.stringContaining('products-report-'));
    });
  });
});
