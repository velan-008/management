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

  it('POST /api/invoices/sync-batch — should idempotently synchronize queued offline invoices', async () => {
    const product = await Product.findOne({ where: { business_id: businessId } });
    const localBillId = `offline-uuid-${Date.now()}`;

    const batchPayload = {
      invoices: [
        {
          local_bill_id: localBillId,
          provisional_number: 'OFFLINE-20261105-T101',
          payment_mode: 'CASH',
          paid_amount: 100,
          payments: [{ method: 'CASH', amount: 100 }],
          items: [
            {
              product_id: product.id,
              quantity: 1,
              unit_name: 'PCS',
              unit_price: 100
            }
          ]
        }
      ]
    };

    // 1. First sync attempt
    const res1 = await request(app)
      .post('/api/invoices/sync-batch')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(batchPayload);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.synced).toBe(1);
    expect(res1.body.data.results.length).toBe(1);

    const firstResult = res1.body.data.results[0];
    expect(firstResult.local_bill_id).toBe(localBillId);
    expect(firstResult.status).toBe('SYNCED');
    expect(firstResult.invoice_number).toMatch(/^INV-/);

    // 2. Duplicate sync attempt (idempotency check)
    const res2 = await request(app)
      .post('/api/invoices/sync-batch')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(batchPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.data.results[0].status).toBe('ALREADY_SYNCED');
    expect(res2.body.data.results[0].invoice_number).toBe(firstResult.invoice_number);
    expect(res2.body.data.results[0].invoice_id).toBe(firstResult.invoice_id);
  });

  describe('Phase 3: Backend Payment Synchronization & Offline Safety Regression Tests', () => {
    it('1. Offline UPI without reference — status is PENDING_CONFIRMATION, paid_amount 0, balance_due = grandTotal', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const localBillId = `offline-upi-noref-${Date.now()}`;

      const res = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoices: [
            {
              local_bill_id: localBillId,
              payment_mode: 'UPI',
              paid_amount: 0,
              payments: [{ method: 'UPI', amount: 50, status: 'PENDING_CONFIRMATION' }],
              items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 50 }]
            }
          ]
        });

      expect(res.status).toBe(200);
      const inv = res.body.data.results[0].invoice;
      expect(inv.payment_status).toBe('PENDING_CONFIRMATION');
      expect(parseFloat(inv.paid_amount)).toBe(0);
      expect(parseFloat(inv.balance_due)).toBe(parseFloat(inv.grand_total));
    });

    it('2. Offline UPI with reference but no confirmation — reference number alone never makes payment PAID', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const localBillId = `offline-upi-withref-${Date.now()}`;

      const res = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoices: [
            {
              local_bill_id: localBillId,
              payment_mode: 'UPI',
              paid_amount: 0,
              payments: [{ method: 'UPI', amount: 80, reference_number: 'UPI-REF-9999', status: 'PENDING_CONFIRMATION' }],
              items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 80 }]
            }
          ]
        });

      expect(res.status).toBe(200);
      const inv = res.body.data.results[0].invoice;
      expect(inv.payment_status).toBe('PENDING_CONFIRMATION');
      expect(parseFloat(inv.paid_amount)).toBe(0);
      expect(parseFloat(inv.balance_due)).toBe(parseFloat(inv.grand_total));
    });

    it('3. Offline Card without confirmation — status is PENDING_CONFIRMATION', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const localBillId = `offline-card-unconfirmed-${Date.now()}`;

      const res = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoices: [
            {
              local_bill_id: localBillId,
              payment_mode: 'CARD',
              paid_amount: 0,
              payments: [{ method: 'CARD', amount: 120, reference_number: 'CARD-AUTH-11', status: 'PENDING_CONFIRMATION' }],
              items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 120 }]
            }
          ]
        });

      expect(res.status).toBe(200);
      const inv = res.body.data.results[0].invoice;
      expect(inv.payment_status).toBe('PENDING_CONFIRMATION');
      expect(parseFloat(inv.paid_amount)).toBe(0);
      expect(parseFloat(inv.balance_due)).toBe(parseFloat(inv.grand_total));
    });

    it('4. Walk-in customer with unconfirmed UPI — synchronizes successfully without requiring customer record', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const localBillId = `walkin-upi-${Date.now()}`;

      const res = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoices: [
            {
              local_bill_id: localBillId,
              customer_id: null, // Walk-in customer
              payment_mode: 'UPI',
              paid_amount: 0,
              payments: [{ method: 'UPI', amount: 90, status: 'PENDING_CONFIRMATION' }],
              items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 90 }]
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('SYNCED');
      expect(res.body.data.results[0].invoice.customer_id).toBeNull();
      expect(res.body.data.results[0].invoice.payment_status).toBe('PENDING_CONFIRMATION');
    });

    it('5. Walk-in customer with unconfirmed Card — synchronizes successfully without requiring customer record', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const localBillId = `walkin-card-${Date.now()}`;

      const res = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoices: [
            {
              local_bill_id: localBillId,
              customer_id: null,
              payment_mode: 'CARD',
              paid_amount: 0,
              payments: [{ method: 'CARD', amount: 75, status: 'PENDING_CONFIRMATION' }],
              items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 75 }]
            }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.results[0].status).toBe('SYNCED');
      expect(res.body.data.results[0].invoice.customer_id).toBeNull();
      expect(res.body.data.results[0].invoice.payment_status).toBe('PENDING_CONFIRMATION');
    });

    it('6. Cash + unconfirmed UPI split payment — status is PARTIALLY_PAID with correct split breakdown', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const localBillId = `split-cash-upi-${Date.now()}`;

      const res = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoices: [
            {
              local_bill_id: localBillId,
              payment_mode: 'SPLIT',
              payments: [
                { method: 'CASH', amount: 40 },
                { method: 'UPI', amount: 60, status: 'PENDING_CONFIRMATION', reference_number: 'SPLIT-UPI-88' }
              ],
              items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 100 }]
            }
          ]
        });

      expect(res.status).toBe(200);
      const inv = res.body.data.results[0].invoice;
      expect(inv.payment_status).toBe('PARTIALLY_PAID');
      expect(parseFloat(inv.paid_amount)).toBe(40);
      expect(parseFloat(inv.balance_due)).toBe(parseFloat(inv.grand_total) - 40);
      expect(parseFloat(inv.paid_amount) + parseFloat(inv.balance_due)).toBe(parseFloat(inv.grand_total));
    });

    it('7. Explicit CREDIT without customer — rejected with 400 CUSTOMER_REQUIRED_FOR_CREDIT', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: null,
          payment_mode: 'CREDIT',
          items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 50 }]
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code || res.body.code).toBe('CUSTOMER_REQUIRED_FOR_CREDIT');
    });

    it('8. Explicit CREDIT with customer — succeeds as UNPAID and increments customer balance', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const customer = await Customer.findOne({ where: { business_id: businessId } });
      const initialBal = parseFloat(customer.outstanding_balance || 0);

      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customer_id: customer.id,
          payment_mode: 'CREDIT',
          items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 60 }]
        });

      expect(res.status).toBe(201);
      const inv = res.body.data.invoice;
      expect(inv.payment_status).toBe('UNPAID');
      expect(parseFloat(inv.balance_due)).toBe(parseFloat(inv.grand_total));

      const updatedCust = await Customer.findByPk(customer.id);
      expect(parseFloat(updatedCust.outstanding_balance)).toBeCloseTo(initialBal + parseFloat(inv.grand_total), 1);
    });

    it('9. Confirmed UPI payment — succeeds as PAID with 0 balance due', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          payment_mode: 'UPI',
          is_payment_confirmed: true,
          reference_number: 'UPI-VERIFIED-999',
          items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 70 }]
        });

      expect(res.status).toBe(201);
      const inv = res.body.data.invoice;
      expect(inv.payment_status).toBe('PAID');
      expect(parseFloat(inv.paid_amount)).toBe(parseFloat(inv.grand_total));
      expect(parseFloat(inv.balance_due)).toBe(0);
    });

    it('10. Duplicate synchronization — idempotently returns existing invoice without duplicates', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const idempotencyKey = `idemp-check-${Date.now()}`;

      const payload = {
        invoices: [
          {
            local_bill_id: idempotencyKey,
            payment_mode: 'CASH',
            items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 35 }]
          }
        ]
      };

      const res1 = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.data.results[0].status).toBe('SYNCED');
      const invoiceId = res1.body.data.results[0].invoice_id;

      const res2 = await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.data.results[0].status).toBe('ALREADY_SYNCED');
      expect(res2.body.data.results[0].invoice_id).toBe(invoiceId);
    });

    it('11. Inventory deduction exactly once — stock decrements only once even when sync is retried', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const initialStock = product.quantity;
      const idempotencyKey = `stock-idemp-${Date.now()}`;

      const payload = {
        invoices: [
          {
            local_bill_id: idempotencyKey,
            payment_mode: 'CASH',
            items: [{ product_id: product.id, quantity: 2, unit_name: 'PCS', unit_price: 30 }]
          }
        ]
      };

      // Attempt 1: stock deductions happen
      await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(payload);

      const afterSync1 = await Product.findByPk(product.id);
      expect(afterSync1.quantity).toBe(initialStock - 2);

      // Attempt 2: retry must not deduct stock again
      await request(app)
        .post('/api/invoices/sync-batch')
        .set('Authorization', `Bearer ${staffToken}`)
        .send(payload);

      const afterSync2 = await Product.findByPk(product.id);
      expect(afterSync2.quantity).toBe(initialStock - 2);
    });

    it('12. Existing online billing regression — standard online invoice creates sale and payment records correctly', async () => {
      const product = await Product.findOne({ where: { business_id: businessId } });
      const res = await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          payment_mode: 'CASH',
          items: [{ product_id: product.id, quantity: 1, unit_name: 'PCS', unit_price: 45 }]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoice.payment_status).toBe('PAID');
      expect(res.body.data.invoice.invoice_number).toMatch(/^INV-/);
    });
  });
});
