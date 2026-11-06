/**
 * BUSINESSFLOW — Master Data Local Cache Manager
 * Caches products, categories, customers, and business settings into IndexedDB.
 * Provides resilient fallbacks when the application operates offline.
 */

import { db } from './db.js';

export const masterDataCache = {
  /**
   * Cache products list in IndexedDB
   */
  async cacheProducts(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    try {
      await db.transaction('rw', db.products, async () => {
        // Prepare sanitized product records
        const sanitized = products.map((p) => ({
          id: p.id,
          sku: p.sku || '',
          barcode: p.barcode || '',
          name: p.name || 'Unnamed Product',
          category_id: p.category_id || null,
          category: p.category ? { id: p.category.id, name: p.category.name } : null,
          brand_id: p.brand_id || null,
          brand: p.brand ? { id: p.brand.id, name: p.brand.name } : null,
          unit_name: p.unit_name || 'PCS',
          carton_pack_qty: p.carton_pack_qty || 1,
          box_pack_qty: p.box_pack_qty || 1,
          selling_price: parseFloat(p.selling_price || 0),
          wholesale_price: parseFloat(p.wholesale_price || p.selling_price || 0),
          stock_quantity: parseFloat(p.stock_quantity || 0),
          tax_rate: parseFloat(p.tax_rate || 0),
          hsn_code: p.hsn_code || '',
          is_active: p.is_active !== undefined ? p.is_active : true,
          batches: Array.isArray(p.batches) ? p.batches : [],
          cachedAt: new Date().toISOString()
        }));
        await db.products.bulkPut(sanitized);
      });
    } catch (err) {
      console.warn('[IndexedDB Cache] Failed to cache products:', err);
    }
  },

  /**
   * Retrieve cached products from IndexedDB
   */
  async getCachedProducts() {
    try {
      return await db.products.toArray();
    } catch (err) {
      console.error('[IndexedDB Cache] Failed to load products from cache:', err);
      return [];
    }
  },

  /**
   * Cache categories in IndexedDB
   */
  async cacheCategories(categories) {
    if (!Array.isArray(categories) || categories.length === 0) return;
    try {
      await db.transaction('rw', db.categories, async () => {
        const sanitized = categories.map((c) => ({
          id: c.id,
          name: c.name || '',
          description: c.description || '',
          is_active: c.is_active !== undefined ? c.is_active : true,
          cachedAt: new Date().toISOString()
        }));
        await db.categories.bulkPut(sanitized);
      });
    } catch (err) {
      console.warn('[IndexedDB Cache] Failed to cache categories:', err);
    }
  },

  /**
   * Retrieve cached categories from IndexedDB
   */
  async getCachedCategories() {
    try {
      return await db.categories.toArray();
    } catch (err) {
      console.error('[IndexedDB Cache] Failed to load categories from cache:', err);
      return [];
    }
  },

  /**
   * Cache customers in IndexedDB
   */
  async cacheCustomers(customers) {
    if (!Array.isArray(customers) || customers.length === 0) return;
    try {
      await db.transaction('rw', db.customers, async () => {
        const sanitized = customers.map((c) => ({
          id: c.id,
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          gstin: c.gstin || '',
          customer_type: c.customer_type || 'RETAIL',
          credit_limit: parseFloat(c.credit_limit || 0),
          outstanding_balance: parseFloat(c.outstanding_balance || 0),
          is_active: c.is_active !== undefined ? c.is_active : true,
          cachedAt: new Date().toISOString()
        }));
        await db.customers.bulkPut(sanitized);
      });
    } catch (err) {
      console.warn('[IndexedDB Cache] Failed to cache customers:', err);
    }
  },

  /**
   * Retrieve cached customers from IndexedDB
   */
  async getCachedCustomers() {
    try {
      return await db.customers.toArray();
    } catch (err) {
      console.error('[IndexedDB Cache] Failed to load customers from cache:', err);
      return [];
    }
  },

  /**
   * Cache business settings
   */
  async cacheBusiness(business) {
    if (!business) return;
    try {
      await db.businessSettings.put({
        key: 'current_business',
        ...business,
        cachedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[IndexedDB Cache] Failed to cache business settings:', err);
    }
  },

  /**
   * Retrieve cached business settings
   */
  async getCachedBusiness() {
    try {
      const record = await db.businessSettings.get('current_business');
      return record || null;
    } catch (err) {
      console.error('[IndexedDB Cache] Failed to load business settings:', err);
      return null;
    }
  }
};

