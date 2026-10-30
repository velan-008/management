import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { Product, StockMovement, Supplier, Purchase, Expense } from '../src/models/index.js';

describe('BUSINESSFLOW — Wholesale Supplier, Purchase & Goods Receipt Tests', () => {
  let adminToken;
  let staffToken;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@apexretail.com', password: 'Staff@123456' });
    staffToken = staffRes.body.data.token;
  });

  it('should create and list wholesale suppliers', async () => {
    const res = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Haldiram Snacks Distributor',
        company_name: 'Haldiram Logistics Ltd',
        phone: '+1-555-9011',
        email: 'supply@haldiram.com',
        gst_number: '27AABCH1111H1Z9',
        state: 'California',
        payment_terms: 'Net 15',
        opening_balance: 500
      });

    expect(res.status).toBe(201);
    expect(res.body.data.supplier.name).toBe('Haldiram Snacks Distributor');
    expect(parseFloat(res.body.data.supplier.outstanding_balance)).toBe(500);

    const listRes = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.suppliers.length).toBeGreaterThan(0);
  });

  it('should create a purchase order for wholesale packaged items', async () => {
    const supplierRes = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);
    const supplier = supplierRes.body.data.suppliers[0];

    const prodRes = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken}`);
    const product = prodRes.body.data.products[0];

    const poRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_id: supplier.id,
        purchase_date: '2026-05-15',
        items: [
          {
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            unit_cost_price: 50.00,
            quantity: 10,
            unit: 'boxes',
            tax_rate: 5.00
          }
        ],
        freight_charges: 25.00,
        discount_total: 10.00,
        paid_amount: 100.00
      });

    expect(poRes.status).toBe(201);
    expect(poRes.body.data.purchase.status).toBe('ORDERED');
    // Subtotal: 500, Tax: 25, Freight: 25, Discount: 10 => Grand Total = 540, Paid: 100 => Balance: 440
    expect(parseFloat(poRes.body.data.purchase.grand_total)).toBe(540);
    expect(parseFloat(poRes.body.data.purchase.balance_due)).toBe(440);
  });

  it('should receive goods, increase stock by confirmed quantity, and write stock movement', async () => {
    // 1. Create a specific test product
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Lays Classic Salted Chips (Box of 20)',
        sku: `SKU-LAYS-${Date.now()}`,
        cost_price: 300.00,
        selling_price: 400.00,
        wholesale_price: 340.00,
        quantity: 10,
        unit: 'boxes',
        tax_rate: 12.00
      });
    const product = prodRes.body.data.product;
    const initialQty = product.quantity; // 10

    const supplierRes = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);
    const supplier = supplierRes.body.data.suppliers[0];

    // 2. Create Purchase Order for 15 boxes
    const poRes = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplier_id: supplier.id,
        items: [
          {
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            unit_cost_price: 300.00,
            quantity: 15,
            unit: 'boxes',
            tax_rate: 12.00
          }
        ]
      });
    const purchase = poRes.body.data.purchase;

    // 3. Confirm Goods Receipt
    const receiveRes = await request(app)
      .post(`/api/purchases/${purchase.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            product_id: product.id,
            quantity_received: 15
          }
        ]
      });
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.data.purchase.status).toBe('RECEIVED');

    // 4. Verify product stock increased by 15
    const updatedProd = await Product.findByPk(product.id);
    expect(updatedProd.quantity).toBe(initialQty + 15);

    // 5. Verify StockMovement ledger entry
    const movement = await StockMovement.findOne({
      where: {
        product_id: product.id,
        type: 'PURCHASE',
        reference_id: purchase.invoice_number
      }
    });
    expect(movement).not.toBeNull();
    expect(movement.quantity_change).toBe(15);
    expect(movement.new_quantity).toBe(initialQty + 15);

    // 6. Prevent duplicate stock update when processing same receipt
    const duplicateReceive = await request(app)
      .post(`/api/purchases/${purchase.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ items: [{ product_id: product.id, quantity_received: 15 }] });
    expect(duplicateReceive.status).toBe(409);
    expect(duplicateReceive.body.error.code).toBe('ALREADY_RECEIVED');
  });

  it('should record supplier payment and update outstanding balance', async () => {
    const supplierRes = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);
    const supplier = supplierRes.body.data.suppliers[0];
    const initialBal = parseFloat(supplier.outstanding_balance) || 0;

    const payRes = await request(app)
      .post(`/api/suppliers/${supplier.id}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 200.00,
        payment_method: 'UPI',
        reference_number: 'UPI-REF-998811',
        notes: 'Monthly settlement part 1'
      });

    expect(payRes.status).toBe(201);
    expect(parseFloat(payRes.body.data.outstanding_balance)).toBe(Math.max(0, initialBal - 200));
  });

  it('should allow staff to submit expense and admin to approve it', async () => {
    // 1. Staff creates daily shop expense (starts as PENDING for staff)
    const expRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        description: 'Snacks Delivery Truck Loading Charges',
        amount: 45.00,
        category: 'Loading & Transport',
        payment_method: 'CASH'
      });
    expect(expRes.status).toBe(201);
    const expense = expRes.body.data.expense;
    expect(expense.approval_status).toBe('PENDING');

    // 2. Admin approves expense
    const approveRes = await request(app)
      .patch(`/api/expenses/${expense.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.expense.approval_status).toBe('APPROVED');
  });
});

