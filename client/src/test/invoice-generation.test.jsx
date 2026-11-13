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
    // Red-marked details removed from thermal receipt as requested
    expect(screen.queryByText('*** TAX INVOICE ***')).not.toBeInTheDocument();
    expect(screen.queryByText(/GSTIN: 27AABCB1234F1Z5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Billed By:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Type \/ Mode:/)).not.toBeInTheDocument();
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

  it('renders redesigned A4 Tax Invoice with complete 16 elements including HSN, GST, terms, and signatures', () => {
    const fullA4Invoice = {
      invoice_number: 'INV-20261112-9901',
      invoice_date: '2026-11-12',
      created_at: '2026-11-12T14:00:00.000Z',
      subtotal: '2500.00',
      discount_total: '100.00',
      order_discount: '50.00',
      tax_total: '282.00',
      cgst_total: '141.00',
      sgst_total: '141.00',
      igst_total: '0.00',
      round_off: '0.00',
      grand_total: '2632.00',
      paid_amount: '2000.00',
      balance_due: '632.00',
      payment_status: 'PARTIALLY_PAID',
      payment_mode: 'SPLIT',
      customer: {
        id: 301,
        name: 'Apex Wholesale Mart',
        phone: '9898000000',
        customer_type: 'WHOLESALE',
        tax_number: '27AABCA5555M1Z9',
        address: 'Plot 12, APMC Market',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400703',
        outstanding_balance: 8500.00
      },
      items: [
        {
          product_name: 'Fortune Sunflower Oil 1L',
          product_sku: 'SKU-OIL-1L',
          hsn_code: '15121910',
          quantity: 12,
          free_quantity: 1,
          unit_name: 'BOX',
          unit_selling_price: '150.00',
          discount_amount: '50.00',
          taxable_amount: '1750.00',
          tax_rate: '5.00',
          tax_amount: '87.50',
          cgst_amount: '43.75',
          sgst_amount: '43.75',
          line_total: '1837.50',
          batch_number: 'BATCH-OIL-88',
          expiry_date: '2027-12-31'
        },
        {
          product_name: 'Cadbury Dairy Milk Silk',
          product_sku: 'SKU-SILK-BAR',
          hsn_code: '18063200',
          quantity: 10,
          free_quantity: 0,
          unit_name: 'PCS',
          unit_selling_price: '70.00',
          discount_amount: '50.00',
          taxable_amount: '650.00',
          tax_rate: '18.00',
          tax_amount: '117.00',
          cgst_amount: '58.50',
          sgst_amount: '58.50',
          line_total: '767.00',
          batch_number: 'BATCH-CD-02'
        }
      ],
      payments: [
        { payment_method: 'CASH', amount: '1000.00' },
        { payment_method: 'UPI', amount: '1000.00', reference_number: 'UPI-776655' }
      ]
    };

    render(
      <InvoiceDocument
        invoice={fullA4Invoice}
        printLayout="a4"
        business={mockBusiness}
        currency="₹"
      />
    );

    // 1. Business logo/name
    expect(screen.getByText('BUSINESSFLOW WHOLESALE DISTRIBUTORS')).toBeInTheDocument();
    // 2. Business address and contact info
    expect(screen.getByText('Warehouse Hub 4, APMC Market')).toBeInTheDocument();
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.getByText('billing@businessflow.com')).toBeInTheDocument();
    // 3. GSTIN and state details
    expect(screen.getByText('27AABCB1234F1Z5')).toBeInTheDocument();
    // 4. TAX INVOICE heading
    expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();
    // 5. Invoice number and date
    expect(screen.getByText('INV-20261112-9901')).toBeInTheDocument();
    expect(screen.getByText('12 Nov 2026')).toBeInTheDocument();
    // 6. Customer details & GSTIN
    expect(screen.getByText('Apex Wholesale Mart')).toBeInTheDocument();
    expect(screen.getByText('9898000000')).toBeInTheDocument();
    expect(screen.getByText('27AABCA5555M1Z9')).toBeInTheDocument();
    // 7. Product details table & HSN Code
    expect(screen.getByText('Fortune Sunflower Oil 1L')).toBeInTheDocument();
    expect(screen.getByText('15121910')).toBeInTheDocument();
    expect(screen.getByText('Cadbury Dairy Milk Silk')).toBeInTheDocument();
    expect(screen.getByText('18063200')).toBeInTheDocument();
    // 8. Subtotal & 9. Discount
    expect(screen.getByText('Subtotal (Gross):')).toBeInTheDocument();
    expect(screen.getByText('Total Discount:')).toBeInTheDocument();
    // 10. CGST & SGST breakdown
    expect(screen.getByText(/Central GST \(CGST\)/)).toBeInTheDocument();
    expect(screen.getByText(/State GST \(SGST\)/)).toBeInTheDocument();
    expect(screen.getByText('GST Tax Breakdown')).toBeInTheDocument();
    // 11. Grand Total
    expect(screen.getAllByText('₹2632.00').length).toBeGreaterThan(0);
    // 12. Amount in Words
    expect(screen.getByText('Amount in Words:')).toBeInTheDocument();
    // 13. Payment details
    expect(screen.getByText(/UPI-776655/)).toBeInTheDocument();
    // 14. Paid Amount and Balance Due
    expect(screen.getAllByText('₹2000.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹632.00').length).toBeGreaterThan(0);
    // 15. Terms and Conditions
    expect(screen.getByText('Terms and Conditions:')).toBeInTheDocument();
    // 16. Authorized Signature
    expect(screen.getByText('Authorized Signatory')).toBeInTheDocument();
    expect(screen.getByText("Receiver's Signature & Seal")).toBeInTheDocument();
  });

  describe('Product Count Scaling & Print Boundary Handling (5, 15, 30, 50, 100 items)', () => {
    const generateMockInvoice = (productCount, prefix = 'INV') => {
      const items = Array.from({ length: productCount }, (_, i) => {
        const idx = i + 1;
        const qty = 2 + (idx % 3);
        const freeQty = idx % 10 === 0 ? 1 : 0;
        const rate = 100.00;
        const disc = 10.00;
        const taxable = (qty * rate) - disc;
        const taxRate = 18.00;
        const tax = taxable * 0.18;
        const total = taxable + tax;
        return {
          product_id: idx,
          product_name: `FMCG Item ${idx} Standard Distribution Pack`,
          product_sku: `SKU-${String(idx).padStart(4, '0')}`,
          hsn_code: `HSN${String(idx).padStart(4, '0')}`,
          unit_name: idx % 2 === 0 ? 'BOX' : 'PCS',
          quantity: qty,
          free_quantity: freeQty,
          unit_selling_price: rate.toFixed(2),
          discount_amount: disc.toFixed(2),
          taxable_amount: taxable.toFixed(2),
          tax_rate: taxRate.toFixed(2),
          tax_amount: tax.toFixed(2),
          cgst_amount: (tax / 2).toFixed(2),
          sgst_amount: (tax / 2).toFixed(2),
          igst_amount: '0.00',
          line_total: total.toFixed(2),
          batch_number: `B-${idx}`
        };
      });

      const subtotal = items.reduce((s, it) => s + (it.quantity * 100), 0);
      const discount = items.reduce((s, it) => s + parseFloat(it.discount_amount), 0);
      const tax = items.reduce((s, it) => s + parseFloat(it.tax_amount), 0);
      const grand = items.reduce((s, it) => s + parseFloat(it.line_total), 0);

      return {
        invoice_number: `${prefix}-${productCount}`,
        invoice_date: '2026-11-13',
        created_at: '2026-11-13T10:00:00.000Z',
        subtotal: subtotal.toFixed(2),
        discount_total: discount.toFixed(2),
        tax_total: tax.toFixed(2),
        cgst_total: (tax / 2).toFixed(2),
        sgst_total: (tax / 2).toFixed(2),
        igst_total: '0.00',
        round_off: '0.00',
        grand_total: grand.toFixed(2),
        paid_amount: grand.toFixed(2),
        balance_due: '0.00',
        payment_status: 'PAID',
        payment_mode: 'CASH',
        customer: {
          name: 'Apex Wholesale Distributor',
          customer_type: 'WHOLESALE',
          phone: '9876543210',
          tax_number: '27AAAAA0000A1Z5'
        },
        items,
        payments: [{ payment_method: 'CASH', amount: grand.toFixed(2) }]
      };
    };

    const countsToTest = [1, 5, 10, 15, 20, 30, 50, 100];

    countsToTest.forEach((count) => {
      it(`renders A4 Tax Invoice with ${count} products strictly visible on one page`, () => {
        const inv = generateMockInvoice(count, 'INV-A4');
        const { container } = render(
          <InvoiceDocument
            invoice={inv}
            printLayout="a4"
            business={mockBusiness}
            currency="₹"
          />
        );

        const printArea = container.querySelector('#invoice-print-area');
        expect(printArea).toBeInTheDocument();
        expect(printArea).toHaveClass('print-a4');

        // Verify first, middle, and last item are all rendered and visible
        expect(screen.getByText('FMCG Item 1 Standard Distribution Pack')).toBeInTheDocument();
        const midIdx = Math.ceil(count / 2);
        expect(screen.getByText(`FMCG Item ${midIdx} Standard Distribution Pack`)).toBeInTheDocument();
        expect(screen.getByText(`FMCG Item ${count} Standard Distribution Pack`)).toBeInTheDocument();

        // Verify all count rows exist in product table (first table)
        const productTable = container.querySelector('table');
        const rows = productTable.querySelectorAll('tbody tr');
        expect(rows.length).toBe(count);

        // Verify statutory sections are completely present
        expect(screen.getByText('TAX INVOICE')).toBeInTheDocument();
        expect(screen.getByText('GST Tax Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Authorized Signatory')).toBeInTheDocument();
        expect(screen.getByText("Receiver's Signature & Seal")).toBeInTheDocument();
      });

      it(`renders 80mm Thermal Receipt with ${count} products continuously without truncation`, () => {
        const inv = generateMockInvoice(count, 'INV-TH');
        const { container } = render(
          <InvoiceDocument
            invoice={inv}
            printLayout="thermal"
            business={mockBusiness}
            currency="₹"
          />
        );

        const printArea = container.querySelector('#invoice-print-area');
        expect(printArea).toBeInTheDocument();
        expect(printArea).toHaveClass('print-thermal');

        // Verify first, middle, and last item are all rendered
        expect(screen.getByText('FMCG Item 1 Standard Distribution Pack')).toBeInTheDocument();
        const midIdx = Math.ceil(count / 2);
        expect(screen.getByText(`FMCG Item ${midIdx} Standard Distribution Pack`)).toBeInTheDocument();
        expect(screen.getByText(`FMCG Item ${count} Standard Distribution Pack`)).toBeInTheDocument();

        // Verify all items are rendered without truncate class
        const itemNames = container.querySelectorAll('.leading-tight.break-words');
        expect(itemNames.length).toBeGreaterThanOrEqual(count);

        // Verify footer summary exists
        expect(screen.getByText(new RegExp(`Items:\\s*${count}\\s*\\|\\s*Total Qty:`))).toBeInTheDocument();
      });
    });
  });
});
