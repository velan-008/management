import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { Customer } from '../src/models/index.js';

describe('BUSINESSFLOW — Stage 6 Customer Management Tests', () => {
  let adminToken;
  let biz2Token;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;

    const biz2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@novaagency.com', password: 'Admin@123456' });
    biz2Token = biz2Res.body.data.token;
  });

  it('should create and retrieve a customer with full details', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Globex Corporation',
        phone: '+1-555-888-0011',
        email: 'procurement@globex.com',
        address: '100 Industrial Parkway',
        state: 'California',
        tax_number: 'US-TAX-889911',
        credit_limit: 5000
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customer.name).toBe('Globex Corporation');
    expect(res.body.data.customer.phone).toBe('+1-555-888-0011');
    expect(parseFloat(res.body.data.customer.credit_limit)).toBe(5000);

    const getRes = await request(app)
      .get(`/api/customers/${res.body.data.customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.customer.name).toBe('Globex Corporation');
  });

  it('should enforce unique phone numbers within the same business tenant', async () => {
    const phone = '+1-555-999-2233';

    const first = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Supplies', phone });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Acme Branch 2', phone });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('DUPLICATE_PHONE');
  });

  it('should allow the same phone number in a different business tenant (tenant isolation)', async () => {
    const sharedPhone = '+1-555-777-3344';

    const biz1Cust = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cross-Tenant Customer', phone: sharedPhone });
    expect(biz1Cust.status).toBe(201);

    const biz2Cust = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${biz2Token}`)
      .send({ name: 'Cross-Tenant Customer in Biz 2', phone: sharedPhone });
    expect(biz2Cust.status).toBe(201);
  });

  it('should prevent destructive deletion of customers with transaction history', async () => {
    // 1. Create product and customer
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Active Purchaser LLC' });
    const customer = custRes.body.data.customer;

    const prodRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Widget for Customer',
        sku: 'SKU-WIDGET-CUST',
        selling_price: 30,
        quantity: 5
      });
    const product = prodRes.body.data.product;

    // 2. Complete sale linked to customer
    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customer_id: customer.id,
        items: [{ product_id: product.id, quantity: 1, unit_price: 30 }]
      });

    // 3. Attempt deleting customer
    const delRes = await request(app)
      .delete(`/api/customers/${customer.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(delRes.status).toBe(400);
    expect(delRes.body.error.code).toBe('HAS_TRANSACTIONS');

    // Customer should still exist
    const checkCust = await Customer.findByPk(customer.id);
    expect(checkCust).toBeDefined();
  });

  it('should reject access to another tenant customers', async () => {
    const custRes = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Secret Enterprise Partner' });
    const customer = custRes.body.data.customer;

    // Business 2 tries to fetch
    const getRes = await request(app)
      .get(`/api/customers/${customer.id}`)
      .set('Authorization', `Bearer ${biz2Token}`);
    expect(getRes.status).toBe(404);

    // Business 2 tries to update
    const putRes = await request(app)
      .put(`/api/customers/${customer.id}`)
      .set('Authorization', `Bearer ${biz2Token}`)
      .send({ name: 'Hacked Name' });
    expect(putRes.status).toBe(404);
  });
});
