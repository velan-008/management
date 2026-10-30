import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { Expense } from '../src/models/index.js';

describe('BUSINESSFLOW — Stage 8 Expenses, Reports & CSV Export Security Tests', () => {
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

  it('should create, list, and validate business expenses', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Office Fiber Internet',
        amount: 120.50,
        category: 'Utilities',
        payment_method: 'BANK_TRANSFER'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.expense.description).toBe('Office Fiber Internet');
    expect(parseFloat(res.body.data.expense.amount)).toBe(120.50);

    // List expenses
    const listRes = await request(app)
      .get('/api/expenses?category=Utilities')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.expenses.some(e => e.description === 'Office Fiber Internet')).toBe(true);

    // Validation: Reject negative or zero amount
    const invalidRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Bad Amount',
        amount: -50
      });
    expect(invalidRes.status).toBe(400);
  });

  it('should return aggregated profit & loss report for date range', async () => {
    const res = await request(app)
      .get('/api/reports/profit-loss')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.revenue).toBeDefined();
    expect(data.costOfGoodsSold).toBeDefined();
    expect(data.grossProfit).toBeDefined();
    expect(data.operatingExpenses).toBeDefined();
    expect(data.netProfit).toBeDefined();
  });

  it('should return inventory valuation and stock health metrics', async () => {
    const res = await request(app)
      .get('/api/reports/inventory')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.totalProducts).toBeGreaterThan(0);
    expect(data.totalCostValuation).toBeGreaterThanOrEqual(0);
    expect(data.totalRetailValuation).toBeGreaterThanOrEqual(0);
  });

  it('should sanitize CSV exports and protect against CSV formula injection', async () => {
    // 1. Create a customer whose name begins with an injection trigger: '=CMD("calc")'
    await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '=CMD("calc")',
        phone: '+1-555-000-9999'
      });

    // 2. Fetch CSV export
    const csvRes = await request(app)
      .get('/api/reports/export/customers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);

    const csvText = csvRes.text;
    // Verify formula character '=' is prepended with single quote "'"
    expect(csvText).toContain("'=CMD(\"\"calc\"\")");
  });

  it('should guarantee multi-tenant isolation on expenses and exports', async () => {
    const expRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Apex Exclusive Subscription',
        amount: 250,
        category: 'Software'
      });
    const expense = expRes.body.data.expense;

    // Business 2 cannot view or delete Business 1 expense
    const getRes = await request(app)
      .get(`/api/expenses/${expense.id}`)
      .set('Authorization', `Bearer ${biz2Token}`);
    expect(getRes.status).toBe(404);

    const delRes = await request(app)
      .delete(`/api/expenses/${expense.id}`)
      .set('Authorization', `Bearer ${biz2Token}`);
    expect(delRes.status).toBe(404);
  });
});
