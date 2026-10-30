import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import './setup.js';

describe('BUSINESSFLOW — Dashboard & Report API Tests', () => {
  let adminToken = '';
  let staffToken = '';
  let novaToken = '';

  beforeAll(async () => {
    // Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;

    // Login Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@apexretail.com', password: 'Staff@123456' });
    staffToken = staffRes.body.data.token;

    // Login Nova Admin
    const novaRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@novaagency.com', password: 'Admin@123456' });
    novaToken = novaRes.body.data.token;
  });

  it('should return computed dashboard metrics for Business 1 (Apex)', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { summary, salesTrend, recentTransactions, lowStockAlerts } = res.body.data;

    // Summary validation
    expect(summary).toBeDefined();
    expect(summary.totalRevenue).toBeGreaterThan(0);
    expect(summary.transactionsCount).toBeGreaterThanOrEqual(2);
    expect(summary.totalExpenses).toBeGreaterThan(0);
    expect(summary.cogs).toBeGreaterThan(0);
    expect(summary.grossProfit).toBeDefined();
    expect(summary.netOperatingProfit).toBeDefined();

    // Low stock alert validation
    expect(lowStockAlerts).toBeInstanceOf(Array);
    expect(lowStockAlerts.length).toBeGreaterThanOrEqual(1);
    expect(lowStockAlerts[0].sku).toBe('SKU-SNK-KURK40');

    // 7-day trend validation
    expect(salesTrend).toBeInstanceOf(Array);
    expect(salesTrend.length).toBe(7);

    // Recent transactions validation
    expect(recentTransactions).toBeInstanceOf(Array);
    expect(recentTransactions.length).toBeGreaterThanOrEqual(2);
    expect(recentTransactions[0].invoiceNumber).toBeDefined();
  });

  it('should allow Staff members to view dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
  });

  it('should guarantee tenant isolation: Business 2 dashboard metrics reflect only Business 2', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${novaToken}`);

    expect(res.status).toBe(200);
    const { summary, recentTransactions } = res.body.data;

    // Nova has 0 sales in seed dataset
    expect(summary.totalRevenue).toBe(0);
    expect(summary.transactionsCount).toBe(0);
    expect(recentTransactions.length).toBe(0);
  });
});
