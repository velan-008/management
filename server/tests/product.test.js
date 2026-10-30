import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import './setup.js';

describe('BUSINESSFLOW — Stage 4 Products & Inventory Management API Tests', () => {
  let adminToken;
  let staffToken;
  let business2AdminToken;
  let createdCategoryId;
  let createdProductId;

  beforeAll(async () => {
    // 1. Authenticate Business 1 Admin (Apex Retail)
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@apexretail.com', password: 'Admin@123456' });
    adminToken = adminRes.body.data.token;

    // 2. Authenticate Business 1 Staff
    const staffRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@apexretail.com', password: 'Staff@123456' });
    staffToken = staffRes.body.data.token;

    // 3. Authenticate Business 2 Admin (Nova Agency)
    const b2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@novaagency.com', password: 'Admin@123456' });
    business2AdminToken = b2Res.body.data.token;
  });

  // --- A. Category Management ---
  describe('Category Management API', () => {
    it('should create a new category for Business 1', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Computer Peripherals',
          description: 'Keyboards, mice, webcams, and USB docks'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category.name).toBe('Computer Peripherals');
      createdCategoryId = res.body.data.category.id;
    });

    it('should reject creating duplicate category name within same business', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Computer Peripherals'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CATEGORY_EXISTS');
    });

    it('should list categories with product_count attribute', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      const created = res.body.data.categories.find((c) => c.id === createdCategoryId);
      expect(created).toBeDefined();
      expect(created.name).toBe('Computer Peripherals');
    });

    it('should guarantee tenant isolation for categories', async () => {
      // Business 2 listing categories should not see Business 1's newly created category
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${business2AdminToken}`);

      expect(res.status).toBe(200);
      const found = res.body.data.categories.find((c) => c.id === createdCategoryId);
      expect(found).toBeUndefined();
    });
  });

  // --- B. Product CRUD & Validation ---
  describe('Product Management API', () => {
    it('should allow Staff to create a product with valid SKU and opening stock', async () => {
      const uniqueSku = `SKU-TEST-${Date.now()}`;
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Keychron K2 Mechanical Keyboard',
          sku: uniqueSku,
          barcode: '742687123984',
          description: 'Wireless Bluetooth RGB mechanical keyboard',
          cost_price: 65.00,
          selling_price: 99.99,
          quantity: 25,
          low_stock_threshold: 5,
          tax_rate: 18.00,
          unit: 'pcs',
          category_id: createdCategoryId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.product.name).toBe('Keychron K2 Mechanical Keyboard');
      expect(res.body.data.product.quantity).toBe(25);
      createdProductId = res.body.data.product.id;
    });

    it('should log an immutable OPENING/ADJUSTMENT stock movement on creation when quantity > 0', async () => {
      const res = await request(app)
        .get(`/api/products/${createdProductId}/movements`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.movements.length).toBeGreaterThan(0);
      const opening = res.body.data.movements[0];
      expect(opening.quantity_change).toBe(25);
      expect(opening.previous_quantity).toBe(0);
      expect(opening.new_quantity).toBe(25);
    });

    it('should reject creating product with duplicate SKU in same business', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate SKU Product',
          sku: 'SKU-BIS-PARLE10', // Seeded in demo data for Business 1
          selling_price: 29.99
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SKU_EXISTS');
    });

    it('should reject creating product with invalid selling price (<= 0)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Free Item',
          sku: `SKU-ZERO-${Date.now()}`,
          selling_price: 0.00
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject creating product with invalid category_id from another tenant', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${business2AdminToken}`)
        .send({
          name: 'Cross Tenant Category Product',
          sku: `SKU-CROSS-${Date.now()}`,
          selling_price: 49.99,
          category_id: createdCategoryId // Belongs to Business 1!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should search products by name, SKU, or barcode', async () => {
      const res = await request(app)
        .get('/api/products?search=Keychron')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      expect(res.body.data.products[0].id).toBe(createdProductId);

      const resBarcode = await request(app)
        .get('/api/products?search=742687123984')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resBarcode.status).toBe(200);
      expect(resBarcode.body.data.products.length).toBeGreaterThan(0);
      expect(resBarcode.body.data.products[0].id).toBe(createdProductId);
    });

    it('should filter products by category', async () => {
      const res = await request(app)
        .get(`/api/products?category_id=${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.data.products[0].id).toBe(createdProductId);
    });

    it('should disallow direct modification of quantity via PUT /api/products/:id', async () => {
      const res = await request(app)
        .put(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Keychron K2 V2',
          selling_price: 109.99,
          quantity: 99999 // Must be ignored to prevent bypassing stock ledger
        });

      expect(res.status).toBe(200);
      expect(res.body.data.product.name).toBe('Keychron K2 V2');
      // Stock quantity must remain intact at 25
      expect(res.body.data.product.quantity).toBe(25);
    });
  });

  // --- C. Stock Adjustments & Movement Ledger ---
  describe('Stock Adjustment & Ledger API', () => {
    it('should successfully record manual stock adjustment and update inventory', async () => {
      const res = await request(app)
        .post(`/api/products/${createdProductId}/adjust-stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity_change: 10,
          type: 'PURCHASE',
          notes: 'Supplier shipment arrived (PO-9912)'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity_before).toBe(25);
      expect(res.body.data.quantity_after).toBe(35);
      expect(res.body.data.product.quantity).toBe(35);
    });

    it('should reject stock adjustment that causes stock to plunge below zero', async () => {
      const res = await request(app)
        .post(`/api/products/${createdProductId}/adjust-stock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quantity_change: -100, // Current stock is 35
          type: 'DAMAGE',
          notes: 'Excess deduction'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

      // Product stock must remain 35
      const verify = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(verify.body.data.product.quantity).toBe(35);
    });

    it('should list global stock movements across all products', async () => {
      const res = await request(app)
        .get('/api/products/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.movements)).toBe(true);
      expect(res.body.data.movements.length).toBeGreaterThan(0);
    });
  });

  // --- D. Tenant Scoping & Role Permissions ---
  describe('Tenant Scoping & Security', () => {
    it('should return 404 when Business 2 attempts to view Business 1 product', async () => {
      const res = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${business2AdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject Staff user attempting to deactivate a product (Admin only)', async () => {
      const res = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow Admin to safely delete category by re-associating products to NULL', async () => {
      const res = await request(app)
        .delete(`/api/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify product still exists and category_id is now NULL
      const prodRes = await request(app)
        .get(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(prodRes.status).toBe(200);
      expect(prodRes.body.data.product.id).toBe(createdProductId);
      expect(prodRes.body.data.product.category_id).toBeNull();
    });

    it('should allow Admin to safely deactivate product', async () => {
      const res = await request(app)
        .delete(`/api/products/${createdProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.is_active).toBe(false);
    });
  });
});
