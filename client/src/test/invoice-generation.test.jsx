import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument.jsx';
import { numberToWords } from '../utils/formatters.js';

describe('BUSINESSFLOW — Invoice Generation System Tests', () => {
  const mockBusiness = {
    name: 'BUSINESSFLOW WHOLESALE DISTRIBUTORS',
    address: 'Warehouse Hub 4, APMC Market',
    phone: '+91 98765 43210',
    email: 'billing@businessflow.com',
    tax_number: '27AABCB1234F1Z5',
    state: 'Maharashtra',
    currency_symbol: '₹'
  };

  const sampleItems = [
    {
      product_id: 1,
      product_name: 'Parle-G Gold 1kg',
      product_sku: 'SKU-PARLE-1K',
      unit_name: 'BOX',
      quantity: 5,
      free_quantity: 1,
      unit_selling_price: '200.00',
      discount_amount: '50.00',
      taxable_amount: '950.00',
      tax_rate: '18.00',
      tax_amount: '171.00',
      cgst_amount: '85.50',
      sgst_amount: '85.50',
      igst_amount: '0.00',
      line_total: '1121.00',
      batch_number: 'BATCH-PG-09'
    },
    {
      product_id: 2,
      product_name: 'Tata Salt 1kg Pack',
      product_sku: 'SKU-TATA-SALT',
      unit_name: 'PCS',
      quantity: 10,
      free_quantity: 0,
      unit_selling_price: '25.00',
      discount_amount: '0.00',
      taxable_amount: '250.00',
      tax_rate: '0.00',
      tax_amount: '0.00',
      cgst_amount: '0.00',
      sgst_amount: '0.00',
      igst_amount: '0.00',
      line_total: '250.00',
      batch_number: 'BATCH-TS-01'
    }
  ];

  it('converts numbers to Indian Rupees words correctly', () => {
    expect(numberToWords(0)).toBe('Zero Rupees Only');
    expect(numberToWords(448)).toBe('Four Hundred Forty Eight Rupees Only');
    expect(numberToWords(1250.50)).toBe('One Thousand Two Hundred Fifty Rupees and Fifty Paise Only');
    expect(numberToWords(100000)).toBe('One Lakh Rupees Only');
  });

  it('renders a Retail Customer Cash Invoice correctly with Tax Invoice header and PAID status', () => {
    const retailInvoice = {
      invoice_number: 'INV-20261104-0001',
      invoice_date: '2026-11-04',
      created_at: '2026-11-04T10:30:00.000Z',
      subtotal: '1250.00',
      discount_total: '50.00',
      tax_total: '171.00',
      cgst_total: '85.50',
      sgst_total: '85.50',
      igst_total: '0.00',
      round_off: '0.00',
      grand_total: '1371.00',
      paid_amount: '1371.00',
      balance_due: '0.00',
      payment_status: 'PAID',
      payment_mode: 'CASH',
      customer: {
        id: 101,
        name: 'Sunil Retail Counter',
        phone: '9876500001',
        customer_type: 'RETAIL'
      },
      items: sampleItems,
      payments: [{ payment_method: 'CASH', amount: '1371.00' }]
    };

    render(
      <InvoiceDocument
        invoice={retailInvoice}
        printLayout="a4"
        business={mockBusiness}
        pricingMode="RETAIL"
        currency="₹"
      />
    );

    // Business Header
    expect(screen.getByText('BUSINESSFLOW WHOLESALE DISTRIBUTORS')).toBeInTheDocument();
    expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();
    expect(screen.getByText('INV-20261104-0001')).toBeInTheDocument();

    // Customer
    expect(screen.getByText('Sunil Retail Counter')).toBeInTheDocument();
    expect(screen.getByText('Retail Customer')).toBeInTheDocument();

    // Items
    expect(screen.getByText('Parle-G Gold 1kg')).toBeInTheDocument();
    expect(screen.getByText('Tata Salt 1kg Pack')).toBeInTheDocument();
    expect(screen.getAllByText('+1').length).toBeGreaterThan(0); // Free quantity in row and footer

    // Totals
    expect(screen.getAllByText('₹1371.00').length).toBeGreaterThan(0);
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });

  it('renders a Wholesale Customer Credit Invoice with outstanding balance and balance due', () => {
    const wholesaleCreditInvoice = {
      invoice_number: 'INV-20261104-0002',
      invoice_date: '2026-11-04',
      created_at: '2026-11-04T11:00:00.000Z',
      subtotal: '5000.00',
      discount_total: '500.00',
      tax_total: '810.00',
      cgst_total: '405.00',
      sgst_total: '405.00',
      igst_total: '0.00',
      round_off: '0.00',
      grand_total: '5310.00',
      paid_amount: '0.00',
      balance_due: '5310.00',
      payment_status: 'UNPAID',
      payment_mode: 'CREDIT',
      customer: {
        id: 202,
        name: 'Gupta Supermarket Wholesale',
        phone: '9822000000',
        customer_type: 'WHOLESALE',
        tax_number: '27AABCG9876E1Z3',
        outstanding_balance: 15000.00
      },
      items: [sampleItems[0]],
      payments: [{ payment_method: 'CREDIT', amount: '5310.00' }]
    };

    render(
      <InvoiceDocument
        invoice={wholesaleCreditInvoice}
        printLayout="a4"
        business={mockBusiness}
        pricingMode="WHOLESALE"
        currency="₹"
      />
    );

    expect(screen.getByText('Gupta Supermarket Wholesale')).toBeInTheDocument();
    expect(screen.getByText('Wholesale Customer')).toBeInTheDocument();
    expect(screen.getByText('27AABCG9876E1Z3')).toBeInTheDocument();
    expect(screen.getByText('UNPAID / ON CREDIT')).toBeInTheDocument();
    expect(screen.getByText('Balance Due on Bill:')).toBeInTheDocument();
  });

  it('renders a Split Payment Invoice correctly displaying Cash, UPI, and Credit breakdowns', () => {
    const splitInvoice = {
      invoice_number: 'INV-20261104-0003',
      invoice_date: '2026-11-04',
      subtotal: '3000.00',
      discount_total: '0.00',
      tax_total: '0.00',
      grand_total: '3000.00',
      paid_amount: '2000.00',
      balance_due: '1000.00',
      payment_status: 'PARTIALLY_PAID',
      payment_mode: 'SPLIT',
      customer: {
        name: 'Raj Traders',
        customer_type: 'WHOLESALE'
      },
      items: [sampleItems[1]],
      payments: [
        { payment_method: 'CASH', amount: '1000.00' },
        { payment_method: 'UPI', amount: '1000.00', reference_number: 'UPI-REF-9988' },
        { payment_method: 'CREDIT', amount: '1000.00' }
      ]
    };

    render(
      <InvoiceDocument
        invoice={splitInvoice}
        printLayout="a4"
        business={mockBusiness}
        currency="₹"
      />
    );

    expect(screen.getByText('PARTIALLY PAID')).toBeInTheDocument();
    expect(screen.getByText(/UPI-REF-9988/)).toBeInTheDocument();
    expect(screen.getByText('BILL OF SUPPLY')).toBeInTheDocument(); // 0% tax invoice
  });

  it('renders an Inter-State GST invoice with IGST instead of CGST/SGST', () => {
    const interStateInvoice = {
      invoice_number: 'INV-20261104-0004',
      invoice_date: '2026-11-04',
      subtotal: '1000.00',
      discount_total: '0.00',
      tax_total: '180.00',
      cgst_total: '0.00',
      sgst_total: '0.00',
      igst_total: '180.00',
      grand_total: '1180.00',
      paid_amount: '1180.00',
      balance_due: '0.00',
      customer: {
        name: 'Gujarat Traders',
        state: 'Gujarat', // Different from Maharashtra
        tax_number: '24AAACG1234D1Z2'
      },
      items: [
        {
          product_name: 'Colgate Toothpaste',
          quantity: 10,
          unit_name: 'PCS',
          unit_selling_price: '100.00',
          taxable_amount: '1000.00',
          tax_rate: '18.00',
          tax_amount: '180.00',
          igst_amount: '180.00',
          cgst_amount: '0.00',
          sgst_amount: '0.00',
          line_total: '1180.00'
        }
      ]
    };

    render(
      <InvoiceDocument
        invoice={interStateInvoice}
        printLayout="a4"
        business={mockBusiness}
        currency="₹"
      />
    );

    expect(screen.getByText(/Integrated GST \(IGST\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Central GST \(CGST\)/)).not.toBeInTheDocument();
  });

  it('renders 80mm Thermal Receipt layout with dense monospace structure', () => {
    const thermalInvoice = {
      invoice_number: 'INV-20261104-0005',
      invoice_date: '2026-11-04',
      created_at: '2026-11-04T12:00:00.000Z',
      subtotal: '500.00',
      discount_total: '20.00',
      tax_total: '24.00',
      cgst_total: '12.00',
      sgst_total: '12.00',
      grand_total: '504.00',
      paid_amount: '504.00',
      balance_due: '0.00',
      payment_mode: 'CASH',
      customer: { name: 'Counter Walk-in' },
      items: [
        {
          product_name: 'Bisleri 1L Water',
          quantity: 25,
          unit_name: 'PCS',
          unit_selling_price: '20.00',
          line_total: '504.00',
          tax_rate: '5.00'
        }
      ]
    };

    const { container } = render(
      <InvoiceDocument
        invoice={thermalInvoice}
        printLayout="thermal"
        business={mockBusiness}
        currency="₹"
      />
    );

    const printArea = container.querySelector('#invoice-print-area');
    expect(printArea).toHaveClass('print-thermal');
    expect(screen.getByText('*** TAX INVOICE ***')).toBeInTheDocument();
    expect(screen.getByText('Bisleri 1L Water')).toBeInTheDocument();
    expect(screen.getByText('GRAND TOTAL:')).toBeInTheDocument();
    expect(screen.getByText(/Computer Generated Wholesale Invoice/)).toBeInTheDocument();
  });

  it('renders a Walk-in Customer bill without selecting any customer', () => {
    const walkInInvoice = {
      invoice_number: 'INV-20261104-0006',
      invoice_date: '2026-11-04',
      created_at: '2026-11-04T12:30:00.000Z',
      subtotal: '250.00',
      discount_total: '0.00',
      tax_total: '12.50',
      cgst_total: '6.25',
      sgst_total: '6.25',
      igst_total: '0.00',
      round_off: '0.00',
      grand_total: '262.50',
      paid_amount: '262.50',
      balance_due: '0.00',
      payment_status: 'PAID',
      payment_mode: 'CASH',
      customer_id: null,
      customer: null,
      items: [
        {
          product_name: 'Britannia Marie Gold',
          quantity: 10,
          unit_name: 'PCS',
          unit_selling_price: '25.00',
          tax_rate: '5.00',
          tax_amount: '12.50',
          line_total: '262.50'
        }
      ],
      payments: [{ payment_method: 'CASH', amount: '262.50' }]
    };

    render(
      <InvoiceDocument
        invoice={walkInInvoice}
        selectedCustomer={null}
        printLayout="a4"
        business={mockBusiness}
        pricingMode="WHOLESALE"
        currency="₹"
      />
    );

    expect(screen.getByText('Walk-in Retail Customer')).toBeInTheDocument();
    expect(screen.getByText('Britannia Marie Gold')).toBeInTheDocument();
    expect(screen.getAllByText('₹262.50').length).toBeGreaterThan(0);
    expect(screen.getByText('PAID')).toBeInTheDocument();
  });
});
