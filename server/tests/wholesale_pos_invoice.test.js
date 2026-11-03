import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { runMigrations } from '../src/database/migrate.js';
import { seedDatabase } from '../src/database/seed.js';
import {
  Business,
  User,
  Customer,
  Product,
  ProductUnit,
  Inventory,
  Sale,
  SaleItem,
  Payment,
  StockMovement
} from '../src/models/index.js';

describe('BUSINESSFLOW — Wholesale FMCG POS & Invoicing Integration Tests', () => {
  let adminToken = '';
  let staffToken = '';
  let businessId = 1;

  beforeAll(async () => {
    await runMigrations('up');
    await seedDatabase();

    // Login as Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;
    businessId = adminRes.body.data.user.business_id;

    // Login as Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@apexretail.com', password: 'Staff@123456' });
    staffToken = staffRes.body.data.token;
  });

  it('GET /api/products/search — should return packaging units, batches, and stock breakdown', async () => {
    const res = await request(app)
      .get('/api/products/search?q=Parle')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);

    const product = res.body.data.products[0];
    expect(product.name).toContain('Parle-G');
    expect(Array.isArray(product.units)).toBe(true);
    expect(product.units.some(u => u.unit_name === 'CTN')).toBe(true);
    expect(product.units.some(u => u.unit_name === 'BOX')).toBe(true);
    expect(product.units.some(u => u.unit_name === 'PCS')).toBe(true);

    expect(Array.isArray(product.batches)).toBe(true);
    expect(product.batches.length).toBeGreaterThan(0);
    expect(product.stock_breakdown).toBeDefined();
    expect(product.stock_breakdown.cartons).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/customers — should return credit limit and current outstanding', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const customers = res.body.data.customers;
    expect(customers.length).toBeGreaterThan(0);

    const subWholesaler = customers.find(c => c.customer_type === 'SUB_WHOLESALER');
    expect(subWholesaler).toBeDefined();
    expect(Number(subWholesaler.credit_limit)).toBeGreaterThan(0);
    expect(subWholesaler.credit_status).toBeDefined();
  });

  it('POST /api/invoices — should process multi-unit sale, batch deduction, and stock movements', async () => {
    // Locate product with units and batches
    const product = await Product.findOne({
      where: { business_id: businessId, name: 'Parle-G Gold Glucose Biscuit (Pack of 12)' },
      include: [
        { model: ProductUnit, as: 'units' },
        { model: Inventory, as: 'batches' }
      ]
    });
    expect(product).toBeDefined();

    const boxUnit = product.units.find(u => u.unit_name === 'BOX');
    const activeBatch = product.batches.find(b => b.stock_quantity > 50);
    expect(boxUnit).toBeDefined();
    expect(activeBatch).toBeDefined();

    const initialBatchStock = activeBatch.stock_quantity;
    const initialProductStock = product.quantity;

    // Bill 2 BOX + 1 BOX Free (conversion factor = 12 in seed, total base qty = 3 * 12 = 36)
    const expectedDeduction = (2 + 1) * Number(boxUnit.conversion_factor);
    const invoicePayload = {
      customer_id: 1,
      items: [
        {
          product_id: product.id,
          batch_number: activeBatch.batch_number,
          unit_name: 'BOX',
          quantity: 2,
          free_quantity: 1,
          unit_price: Number(boxUnit.wholesale_price),
          conversion_factor: Number(boxUnit.conversion_factor),
          discount_amount: 0,
          tax_rate: Number(product.tax_rate)
        }
      ],
      payment_mode: 'CASH',
      payments: [
        {
          payment_method: 'CASH',
          amount: (2 * Number(boxUnit.wholesale_price) * (1 + Number(product.tax_rate) / 100)).toFixed(2)
        }
      ]
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(invoicePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.invoice.invoice_number).toMatch(/INV-/);

    // Verify database updates
    const updatedBatch = await Inventory.findByPk(activeBatch.id);
    expect(updatedBatch.stock_quantity).toBe(initialBatchStock - expectedDeduction);

    const updatedProduct = await Product.findByPk(product.id);
    expect(updatedProduct.quantity).toBe(initialProductStock - expectedDeduction);

    // Verify stock movement
    const movement = await StockMovement.findOne({
      where: {
        product_id: product.id,
        batch_number: activeBatch.batch_number,
        type: 'SALE'
      },
      order: [['created_at', 'DESC']]
    });
    expect(movement).toBeDefined();
    expect(movement.quantity_change).toBe(-expectedDeduction);
  });

  it('POST /api/invoices — should support Split Tender payments (CASH + UPI + CREDIT)', async () => {
    const product = await Product.findOne({
      where: { business_id: businessId },
      include: [{ model: ProductUnit, as: 'units' }]
    });
    const pcsUnit = product.units.find(u => u.unit_name === 'PCS') || { conversion_factor: 1, wholesale_price: 100 };

    const unitPrice = 100;
    const qty = 5;
    const subtotal = unitPrice * qty; // 500
    const taxRate = Number(product.tax_rate || 5);
    const taxAmount = (subtotal * taxRate) / 100; // 25
    const netAmount = subtotal + taxAmount; // 525

    const splitPayload = {
      customer_id: 2, // Sub-wholesaler with credit limit
      items: [
        {
          product_id: product.id,
          unit_name: 'PCS',
          quantity: qty,
          free_quantity: 0,
          unit_price: unitPrice,
          conversion_factor: 1,
          discount_amount: 0,
          tax_rate: taxRate
        }
      ],
      payment_mode: 'SPLIT',
      payments: [
        { payment_method: 'CASH', amount: 200 },
        { payment_method: 'UPI', amount: 200, reference_number: 'UPI987654321' },
        { payment_method: 'CREDIT', amount: 125 }
      ]
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(splitPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const invoiceId = res.body.data.invoice.id;
    const payments = await Payment.findAll({ where: { sale_id: invoiceId } });
    expect(payments.length).toBe(3);
    expect(payments.some(p => p.payment_method === 'CASH' && Number(p.amount) === 200)).toBe(true);
    expect(payments.some(p => p.payment_method === 'UPI' && Number(p.amount) === 200)).toBe(true);
    expect(payments.some(p => p.payment_method === 'CREDIT' && Number(p.amount) === 125)).toBe(true);
  });

  it('POST /api/invoices — should reject CREDIT payment exceeding customer credit limit', async () => {
    const customer = await Customer.create({
      business_id: businessId,
      name: 'Low Credit Retailer',
      phone: '9000000099',
      customer_type: 'REGULAR',
      credit_limit: 100.00
    });

    const product = await Product.findOne({ where: { business_id: businessId } });

    const payload = {
      customer_id: customer.id,
      items: [
        {
          product_id: product.id,
          unit_name: 'PCS',
          quantity: 1,
          free_quantity: 0,
          unit_price: 500,
          conversion_factor: 1,
          tax_rate: 0
        }
      ],
      payment_mode: 'CREDIT',
      payments: [
        { payment_method: 'CREDIT', amount: 500 } // Exceeds limit of 100
      ]
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const errorMessage = res.body.error?.message || res.body.message || '';
    expect(errorMessage).toMatch(/credit limit exceeded/i);
  });

  it('POST /api/invoices — should reject sale from an expired batch', async () => {
    const product = await Product.findOne({ where: { business_id: businessId } });
    
    // Create an expired batch with unique batch number
    const expiredBatch = await Inventory.create({
      business_id: businessId,
      product_id: product.id,
      batch_number: `BATCH-EXP-${Date.now()}`,
      expiry_date: '2020-01-01',
      stock_quantity: 100
    });

    const payload = {
      customer_id: 1,
      items: [
        {
          product_id: product.id,
          batch_number: expiredBatch.batch_number,
          unit_name: 'PCS',
          quantity: 1,
          free_quantity: 0,
          unit_price: 50,
          conversion_factor: 1,
          tax_rate: 0
        }
      ],
      payment_mode: 'CASH',
      payments: [{ payment_method: 'CASH', amount: 50 }]
    };

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(payload);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
    const errorMessage = res.body.error?.message || res.body.message || '';
    expect(errorMessage).toMatch(/expired/i);
  });
});
