import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { Product, Customer, Sale, SaleItem, Payment, StockMovement } from '../src/models/index.js';

describe('BUSINESSFLOW — Stage 5 Sales, Billing & GST Invoices Tests', () => {
  let adminToken;
  let staffToken;
  let biz2Token;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;

    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@apexretail.com', password: 'Staff@123456' });
    staffToken = staffRes.body.data.token;

    const biz2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@novaagency.com', password: 'Admin@123456' });
    biz2Token = biz2Res.body.data.token;
  });

  it('should successfully complete a sale, deduct inventory, and write stock movement', async () => {
    // 1. Create a product with initial stock
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Gaming Headset Pro',
        sku: 'SKU-HEADSET-PRO',
        selling_price: 100,
        cost_price: 60,
        quantity: 15,
        tax_rate: 18
      });
    expect(prodRes.status).toBe(201);
    const product = prodRes.body.data.product;

    // 2. Perform checkout
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [
          {
            product_id: product.id,
            quantity: 3,
            unit_price: 100,
            discount_percent: 10
          }
        ],
        order_discount: 0,
        payment_method: 'CASH',
        paid_amount: 320
      });

    expect(saleRes.status).toBe(201);
    const sale = saleRes.body.data.sale;
    expect(sale.invoice_number).toMatch(/^INV-\d{8}-\d{4}/);
    expect(sale.status).toBe('COMPLETED');
    expect(sale.items.length).toBe(1);

    // Verify line item calculation
    // Gross: 3 * 100 = 300. Disc 10%: 30. Taxable: 270. Tax 18%: 48.60. Total: 318.60 -> rounded to 319.
    expect(parseFloat(sale.grand_total)).toBe(319);
    expect(parseFloat(sale.paid_amount)).toBe(319); // Capped at grand total
    expect(sale.payment_status).toBe('PAID');

    // 3. Verify product stock was atomically deducted (15 - 3 = 12)
    const updatedProd = await Product.findByPk(product.id);
    expect(updatedProd.quantity).toBe(12);

    // 4. Verify immutable StockMovement record was written with correct column names
    const movement = await StockMovement.findOne({
      where: { product_id: product.id, type: 'SALE' },
      order: [['id', 'DESC']]
    });
    expect(movement).toBeDefined();
    expect(movement.previous_quantity).toBe(15);
    expect(movement.new_quantity).toBe(12);
    expect(movement.quantity_change).toBe(-3);
  });

  it('should reject sale when requested quantity exceeds available stock', async () => {
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Limited Keyboard',
        sku: 'SKU-KB-LTD',
        selling_price: 80,
        quantity: 2
      });
    const product = prodRes.body.data.product;

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ product_id: product.id, quantity: 5 }]
      });

    expect(res.status).toBe(422);
    expect(res.body.error.message).toMatch(/insufficient stock/i);

    // Verify stock was not changed
    const p = await Product.findByPk(product.id);
    expect(p.quantity).toBe(2);
  });

  it('should calculate inter-state IGST vs intra-state CGST+SGST correctly', async () => {
    // Apex Retail is based in California
    // Create local customer in California (intra-state)
    const localCustRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Local Tech Corp',
        state: 'California'
      });
    const localCust = localCustRes.body.data.customer;

    // Create out-of-state customer in Texas (inter-state)
    const remoteCustRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Texas Instruments Partner',
        state: 'Texas'
      });
    const remoteCust = remoteCustRes.body.data.customer;

    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Taxed Sensor Node',
        sku: 'SKU-TX-SENSOR',
        selling_price: 100,
        quantity: 20,
        tax_rate: 10
      });
    const product = prodRes.body.data.product;

    // Intra-state sale: Should split 50/50 as CGST and SGST
    const localSale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: localCust.id,
        items: [{ product_id: product.id, quantity: 1, unit_price: 100 }]
      });
    expect(localSale.status).toBe(201);
    expect(parseFloat(localSale.body.data.sale.cgst_total)).toBe(5);
    expect(parseFloat(localSale.body.data.sale.sgst_total)).toBe(5);
    expect(parseFloat(localSale.body.data.sale.igst_total)).toBe(0);

    // Inter-state sale: Should assign 100% to IGST
    const remoteSale = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: remoteCust.id,
        items: [{ product_id: product.id, quantity: 1, unit_price: 100 }]
      });
    expect(remoteSale.status).toBe(201);
    expect(parseFloat(remoteSale.body.data.sale.cgst_total)).toBe(0);
    expect(parseFloat(remoteSale.body.data.sale.sgst_total)).toBe(0);
    expect(parseFloat(remoteSale.body.data.sale.igst_total)).toBe(10);
  });

  it('should support idempotency key to prevent accidental duplicate sales', async () => {
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'USB-C Cable',
        sku: 'SKU-CABLE-1M',
        selling_price: 10,
        quantity: 10
      });
    const product = prodRes.body.data.product;

    const idempotencyKey = `REQ-${Date.now()}`;
    const payload = {
      items: [{ product_id: product.id, quantity: 1 }],
      idempotency_key: idempotencyKey,
      paid_amount: 10
    };

    const firstCall = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(firstCall.status).toBe(201);
    const invoiceId = firstCall.body.data.sale.id;

    // Repeat identical request with same idempotency key
    const secondCall = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);
    expect(secondCall.status).toBe(200);
    expect(secondCall.body.data.sale.id).toBe(invoiceId);

    // Stock should only be deducted once (10 - 1 = 9)
    const p = await Product.findByPk(product.id);
    expect(p.quantity).toBe(9);
  });

  it('should handle partial payments, balance due, and subsequent payments', async () => {
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Monitor Stand',
        sku: 'SKU-MON-STAND',
        selling_price: 100,
        quantity: 5
      });
    const product = prodRes.body.data.product;

    // Partial checkout: Paid $40 on $100 sale
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ product_id: product.id, quantity: 1, unit_price: 100 }],
        paid_amount: 40
      });

    expect(saleRes.status).toBe(201);
    const sale = saleRes.body.data.sale;
    expect(sale.payment_status).toBe('PARTIALLY_PAID');
    expect(parseFloat(sale.balance_due)).toBe(60);

    // Record second payment of $60
    const payRes = await request(app)
      .post(`/api/sales/${sale.id}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 60,
        method: 'UPI'
      });
    expect(payRes.status).toBe(201);
    expect(payRes.body.data.sale.payment_status).toBe('PAID');
    expect(parseFloat(payRes.body.data.sale.balance_due)).toBe(0);

    // Reject attempt to overpay an already paid invoice
    const overpayRes = await request(app)
      .post(`/api/sales/${sale.id}/payments`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 10
      });
    expect(overpayRes.status).toBe(422);
  });

  it('should process returns/refunds, restore stock, and write return movement', async () => {
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Ergonomic Mousepad',
        sku: 'SKU-PAD-ERGO',
        selling_price: 25,
        quantity: 10
      });
    const product = prodRes.body.data.product;

    // Purchase 2 items
    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ product_id: product.id, quantity: 2, unit_price: 25 }],
        paid_amount: 50
      });
    const sale = saleRes.body.data.sale;
    const saleItemId = sale.items[0].id;

    // Stock should be 8
    let p = await Product.findByPk(product.id);
    expect(p.quantity).toBe(8);

    // Refund 1 item
    const refundRes = await request(app)
      .post(`/api/sales/${sale.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ sale_item_id: saleItemId, quantity: 1 }],
        reason: 'Defective packaging',
        refund_method: 'CASH'
      });

    expect(refundRes.status).toBe(201);
    expect(parseFloat(refundRes.body.data.total_refunded)).toBe(25);

    // Product stock should be restored to 9
    p = await Product.findByPk(product.id);
    expect(p.quantity).toBe(9);

    // Verify RETURN stock movement entry
    const returnMovement = await StockMovement.findOne({
      where: { product_id: product.id, type: 'RETURN' },
      order: [['id', 'DESC']]
    });
    expect(returnMovement).toBeDefined();
    expect(returnMovement.previous_quantity).toBe(8);
    expect(returnMovement.new_quantity).toBe(9);
    expect(returnMovement.quantity_change).toBe(1);

    // Sale should now be PARTIALLY_REFUNDED
    const updatedSale = await Sale.findByPk(sale.id);
    expect(updatedSale.status).toBe('PARTIALLY_REFUNDED');
    expect(parseFloat(updatedSale.refunded_amount)).toBe(25);
  });

  it('should enforce multi-tenant isolation on sales and payments', async () => {
    // Create sale in Business 1
    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Apex Exclusive Tool',
        sku: 'SKU-APEX-TOOL',
        selling_price: 50,
        quantity: 5
      });
    const product = prodRes.body.data.product;

    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        items: [{ product_id: product.id, quantity: 1, unit_price: 50 }]
      });
    const sale = saleRes.body.data.sale;

    // Business 2 tries to access Business 1's sale
    const biz2Get = await request(app)
      .get(`/api/sales/${sale.id}`)
      .set('Authorization', `Bearer ${biz2Token}`);
    expect(biz2Get.status).toBe(404);

    // Business 2 tries to record a payment on Business 1's sale
    const biz2Pay = await request(app)
      .post(`/api/sales/${sale.id}/payments`)
      .set('Authorization', `Bearer ${biz2Token}`)
      .send({ amount: 50 });
    expect(biz2Pay.status).toBe(404);
  });
});
