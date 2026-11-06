import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { db, logSyncEvent, getStorageStats, initPersistentStorage } from '../offline/db.js';
import { connectionManager, CONNECTION_STATUS } from '../offline/connectionManager.js';
import { masterDataCache } from '../offline/masterDataCache.js';
import { cartPersistence } from '../offline/cartPersistence.js';
import { offlineInvoiceManager, generateProvisionalReference } from '../offline/offlineInvoiceManager.js';
import { syncManager } from '../offline/syncManager.js';
import { invoiceService } from '../services/businessServices.js';
import { ConnectionBadge } from '../components/pos/ConnectionBadge.jsx';
import { InvoiceDocument } from '../components/invoice/InvoiceDocument.jsx';

describe('PHASE 1 & 2 — Offline Billing System Complete Tests', () => {
  beforeEach(async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true
    });

    // Clear all stores before each test
    await db.products.clear();
    await db.categories.clear();
    await db.customers.clear();
    await db.businessSettings.clear();
    await db.activeCart.clear();
    await db.offlineInvoices.clear();
    await db.syncQueue.clear();
    await db.syncLogs.clear();
  });

  describe('1. IndexedDB Database & Schema', () => {
    it('creates all 8 required stores with correct schema', () => {
      expect(db.products).toBeDefined();
      expect(db.categories).toBeDefined();
      expect(db.customers).toBeDefined();
      expect(db.businessSettings).toBeDefined();
      expect(db.activeCart).toBeDefined();
      expect(db.offlineInvoices).toBeDefined();
      expect(db.syncQueue).toBeDefined();
      expect(db.syncLogs).toBeDefined();
    });

    it('records and counts entries correctly via getStorageStats', async () => {
      await db.products.add({ id: 1, name: 'Parle-G 100g', selling_price: 10, is_active: true });
      await db.categories.add({ id: 1, name: 'Biscuits', is_active: true });
      await db.customers.add({ id: 1, name: 'Ramesh Supermarket', phone: '9876543210', is_active: true });

      const stats = await getStorageStats();
      expect(stats.products).toBe(1);
      expect(stats.categories).toBe(1);
      expect(stats.customers).toBe(1);
      expect(stats.pendingInvoices).toBe(0);
    });

    it('records sync audit logs safely', async () => {
      await logSyncEvent('HEALTH_CHECK', 'SUCCESS', { db: 'UP' });
      const logs = await db.syncLogs.toArray();
      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('HEALTH_CHECK');
      expect(logs[0].status).toBe('SUCCESS');
      expect(logs[0].details.db).toBe('UP');
    });
  });

  describe('2. Master Data Caching & Offline Fallback', () => {
    it('caches and retrieves product records with pricing and packaging unit details', async () => {
      const sampleProducts = [
        {
          id: 101,
          name: 'Britannia Good Day Butter',
          sku: 'SKU-GD-100',
          barcode: '8901063012345',
          category_id: 1,
          selling_price: 30,
          wholesale_price: 25,
          stock_quantity: 50,
          tax_rate: 5,
          carton_pack_qty: 24,
          unit_name: 'BOX'
        }
      ];

      await masterDataCache.cacheProducts(sampleProducts);
      const cached = await masterDataCache.getCachedProducts();

      expect(cached.length).toBe(1);
      expect(cached[0].id).toBe(101);
      expect(cached[0].wholesale_price).toBe(25);
      expect(cached[0].carton_pack_qty).toBe(24);
    });

    it('caches categories, customers, and business settings', async () => {
      await masterDataCache.cacheCategories([{ id: 1, name: 'Chocolates' }]);
      await masterDataCache.cacheCustomers([{ id: 10, name: 'Suresh Kirana', customer_type: 'WHOLESALE' }]);
      await masterDataCache.cacheBusiness({ name: 'Apex Wholesale', gstin: '33AAAAA0000A1Z5' });

      const categories = await masterDataCache.getCachedCategories();
      const customers = await masterDataCache.getCachedCustomers();
      const business = await masterDataCache.getCachedBusiness();

      expect(categories[0].name).toBe('Chocolates');
      expect(customers[0].customer_type).toBe('WHOLESALE');
      expect(business.gstin).toBe('33AAAAA0000A1Z5');
    });
  });

  describe('3. Active Cart Recovery Foundation', () => {
    it('saves active cart state to IndexedDB and recovers it accurately', async () => {
      const cartData = {
        cart: [
          {
            product_id: 101,
            name: 'Britannia Good Day Butter',
            quantity: 2,
            unit_price: 25,
            pack_unit: 'BOX',
            tax_rate: 5
          }
        ],
        selectedCustomer: { id: 10, name: 'Suresh Kirana' },
        pricingMode: 'WHOLESALE',
        orderDiscount: 10,
        paymentMode: 'CASH'
      };

      await cartPersistence.save(cartData);
      const restored = await cartPersistence.load();

      expect(restored).toBeDefined();
      expect(restored.cart.length).toBe(1);
      expect(restored.cart[0].product_id).toBe(101);
      expect(restored.selectedCustomer.name).toBe('Suresh Kirana');
      expect(restored.pricingMode).toBe('WHOLESALE');
      expect(restored.orderDiscount).toBe(10);
    });

    it('clears active cart after invoice completion or manual reset', async () => {
      await cartPersistence.save({
        cart: [{ product_id: 1, quantity: 1, unit_price: 10 }],
        pricingMode: 'RETAIL'
      });

      let loaded = await cartPersistence.load();
      expect(loaded).not.toBeNull();

      await cartPersistence.clear();
      loaded = await cartPersistence.load();
      expect(loaded).toBeNull();
    });
  });

  describe('4. Connectivity Detection & Health Check', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('transitions to ONLINE when backend returns HTTP 200 with database UP', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'OK',
          data: { status: 'OK', database: 'UP' }
        })
      });

      await connectionManager.checkHealth(true);
      expect(connectionManager.getStatus()).toBe(CONNECTION_STATUS.ONLINE);
    });

    it('transitions to DEGRADED when database is DOWN (HTTP 503 or db DOWN)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          data: { status: 'DEGRADED', database: 'DOWN' }
        })
      });

      await connectionManager.checkHealth(true);
      expect(connectionManager.getStatus()).toBe(CONNECTION_STATUS.DEGRADED);
    });

    it('transitions to SERVER_DOWN when backend cannot be reached', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await connectionManager.checkHealth(true);
      expect(connectionManager.getStatus()).toBe(CONNECTION_STATUS.SERVER_DOWN);
    });

    it('transitions to OFFLINE when browser reports offline', () => {
      connectionManager.updateStatus(CONNECTION_STATUS.OFFLINE, 'Browser offline');
      expect(connectionManager.getStatus()).toBe(CONNECTION_STATUS.OFFLINE);
    });
  });

  describe('5. Phase 2: Offline Checkout & Provisional Numbering', () => {
    it('generates provisional reference in OFFLINE-YYYYMMDD-XXXX format', () => {
      const ref = generateProvisionalReference();
      expect(ref).toMatch(/^OFFLINE-\d{8}-[A-Z0-9]{4}$/);
    });

    it('creates offline invoice, decrements local stock, and enqueues sync task atomically', async () => {
      // Seed a cached product in IndexedDB
      await db.products.put({
        id: 201,
        name: 'Cadbury Dairy Milk 50g',
        selling_price: 50,
        wholesale_price: 45,
        stock_quantity: 20,
        tax_rate: 18,
        unit_name: 'PCS'
      });

      const offlineBill = await offlineInvoiceManager.createOfflineInvoice({
        cart: [
          {
            product_id: 201,
            name: 'Cadbury Dairy Milk 50g',
            quantity: 3,
            unit_price: 45,
            tax_rate: 18,
            unit_name: 'PCS'
          }
        ],
        selectedCustomer: null,
        pricingMode: 'WHOLESALE',
        paymentMode: 'CASH',
        business: { state: 'Maharashtra' }
      });

      expect(offlineBill.local_bill_id).toBeDefined();
      expect(offlineBill.provisional_number).toMatch(/^OFFLINE-/);
      expect(offlineBill.status).toBe('PENDING_SYNC');
      expect(offlineBill.is_offline).toBe(true);
      expect(offlineBill.payment_status).toBe('PAID');

      // Verify invoice in offlineInvoices store
      const storedInv = await db.offlineInvoices.get(offlineBill.local_bill_id);
      expect(storedInv).toBeDefined();
      expect(storedInv.grand_total).toBe(offlineBill.grand_total);

      // Verify task in syncQueue
      const queuedTask = await db.syncQueue.get(offlineBill.local_bill_id);
      expect(queuedTask).toBeDefined();
      expect(queuedTask.status).toBe('PENDING');

      // Verify local inventory decrement: 20 - 3 = 17
      const updatedProduct = await db.products.get(201);
      expect(updatedProduct.stock_quantity).toBe(17);
    });

    it('correctly records credit payment and updates customer outstanding balance', async () => {
      await db.customers.put({
        id: 55,
        name: 'Sharma Traders',
        customer_type: 'WHOLESALE',
        outstanding_balance: 1000,
        credit_limit: 10000
      });

      await db.products.put({
        id: 301,
        name: 'Item A',
        selling_price: 100,
        stock_quantity: 10,
        tax_rate: 0
      });

      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: [{ product_id: 301, quantity: 2, unit_price: 100, tax_rate: 0 }],
        selectedCustomer: { id: 55, name: 'Sharma Traders', outstanding_balance: 1000 },
        paymentMode: 'CREDIT'
      });

      expect(bill.payment_status).toBe('UNPAID');
      expect(parseFloat(bill.balance_due)).toBe(200);

      // Customer outstanding balance updated: 1000 + 200 = 1200
      const updatedCust = await db.customers.get(55);
      expect(updatedCust.outstanding_balance).toBe(1200);
    });
  });

  describe('6. Phase 2: Offline Bill Printing Display', () => {
    it('renders provisional offline badge and offline reference clearly in thermal and A4 printouts', () => {
      const mockOfflineInvoice = {
        local_bill_id: 'uuid-123',
        provisional_number: 'OFFLINE-20261105-X999',
        is_offline: true,
        status: 'PENDING_SYNC',
        grand_total: '159.00',
        subtotal: '135.00',
        tax_total: '24.00',
        paid_amount: '159.00',
        balance_due: '0.00',
        payment_mode: 'CASH',
        items: [
          {
            product_name: 'Marie Gold Biscuits',
            quantity: 3,
            unit_price: 45,
            line_total: 159,
            unit_name: 'PCS'
          }
        ]
      };

      render(<InvoiceDocument invoice={mockOfflineInvoice} printLayout="thermal" />);
      expect(screen.getByText(/\*\*\* PROVISIONAL OFFLINE BILL \*\*\*/)).toBeInTheDocument();
      expect(screen.getByText('OFFLINE-20261105-X999')).toBeInTheDocument();
      expect(screen.getByText(/PROVISIONAL OFFLINE BILL — PENDING SYNC/i)).toBeInTheDocument();
    });
  });

  describe('7. Phase 2: Synchronization & Status Transition', () => {
    it('synchronizes pending bills via syncBatch and updates local status to SYNCED', async () => {
      // 1. Create offline bill
      await db.products.put({ id: 99, name: 'Sample Item', selling_price: 10, stock_quantity: 5 });
      const offlineBill = await offlineInvoiceManager.createOfflineInvoice({
        cart: [{ product_id: 99, quantity: 1, unit_price: 10, tax_rate: 0 }],
        paymentMode: 'CASH'
      });

      expect(await db.syncQueue.where('status').equals('PENDING').count()).toBe(1);

      // 2. Mock invoiceService.syncBatch to simulate successful server processing
      vi.spyOn(invoiceService, 'syncBatch').mockResolvedValue({
        data: {
          success: true,
          results: [
            {
              local_bill_id: offlineBill.local_bill_id,
              status: 'SYNCED',
              invoice_id: 888,
              invoice_number: 'INV-20261105-0042',
              invoice: {
                id: 888,
                invoice_number: 'INV-20261105-0042'
              }
            }
          ]
        }
      });

      connectionManager.updateStatus(CONNECTION_STATUS.ONLINE);
      const syncResult = await syncManager.syncAllPending();

      expect(syncResult.synced).toBe(1);
      expect(syncResult.total).toBe(1);

      // Verify local bill updated to SYNCED with official invoice number
      const updatedInv = await db.offlineInvoices.get(offlineBill.local_bill_id);
      expect(updatedInv.status).toBe('SYNCED');
      expect(updatedInv.is_offline).toBe(false);
      expect(updatedInv.invoice_number).toBe('INV-20261105-0042');
      expect(updatedInv.server_invoice_id).toBe(888);

      // Verify syncQueue task is now SYNCED
      const updatedTask = await db.syncQueue.get(offlineBill.local_bill_id);
      expect(updatedTask.status).toBe('SYNCED');
    });
  });

  describe('8. Phase 2: Payment Safety & Confirmation Rules', () => {
    const sampleCart = [
      {
        product_id: 501,
        name: 'Good Day Butter 100g',
        quantity: 2,
        unit_price: 50,
        tax_rate: 0
      }
    ];

    it('1. handles offline UPI without reference as PENDING_CONFIRMATION with paid_amount 0', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'UPI',
        upiRef: ''
      });

      expect(bill.payment_mode).toBe('UPI');
      expect(bill.payment_status).toBe('PENDING_CONFIRMATION');
      expect(bill.paid_amount).toBe('0.00');
      expect(bill.balance_due).toBe('100.00');
      expect(bill.payments[0].status).toBe('PENDING_CONFIRMATION');
      expect(bill.payments[0].amount).toBe(100);
    });

    it('2. handles offline UPI with reference but without verified confirmation as PENDING_CONFIRMATION', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'UPI',
        upiRef: 'UPI-TXN-987654'
      });

      // Entered reference number alone must NOT mark bill as PAID
      expect(bill.payment_mode).toBe('UPI');
      expect(bill.payment_status).toBe('PENDING_CONFIRMATION');
      expect(bill.paid_amount).toBe('0.00');
      expect(bill.balance_due).toBe('100.00');
      expect(bill.payments[0].reference_number).toBe('UPI-TXN-987654');
      expect(bill.payments[0].status).toBe('PENDING_CONFIRMATION');
    });

    it('3. handles offline UPI with verified confirmation as PAID with full paid_amount', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'UPI',
        upiRef: 'UPI-CONFIRMED-8899',
        isPaymentConfirmed: true
      });

      expect(bill.payment_mode).toBe('UPI');
      expect(bill.payment_status).toBe('PAID');
      expect(bill.paid_amount).toBe('100.00');
      expect(bill.balance_due).toBe('0.00');
      expect(bill.payments[0].status).toBe('PAID');
    });

    it('4. handles offline Card without verified confirmation as PENDING_CONFIRMATION', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'CARD',
        cardRef: 'CARD-AUTH-1234'
      });

      expect(bill.payment_mode).toBe('CARD');
      expect(bill.payment_status).toBe('PENDING_CONFIRMATION');
      expect(bill.paid_amount).toBe('0.00');
      expect(bill.balance_due).toBe('100.00');
      expect(bill.payments[0].status).toBe('PENDING_CONFIRMATION');
    });

    it('5. handles Cash payment correctly as PAID with 0 balance due', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'CASH'
      });

      expect(bill.payment_mode).toBe('CASH');
      expect(bill.payment_status).toBe('PAID');
      expect(bill.paid_amount).toBe('100.00');
      expect(bill.balance_due).toBe('0.00');
      expect(bill.payments[0].status).toBe('PAID');
    });

    it('6. handles Credit payment correctly as UNPAID with full balance due', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'CREDIT',
        selectedCustomer: { id: 80, name: 'Wholesale Store' }
      });

      expect(bill.payment_mode).toBe('CREDIT');
      expect(bill.payment_status).toBe('UNPAID');
      expect(bill.paid_amount).toBe('0.00');
      expect(bill.balance_due).toBe('100.00');
      expect(bill.payments[0].status).toBe('OUTSTANDING');
    });

    it('7. handles Split Cash + UPI with unconfirmed UPI as PARTIALLY_PAID', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });
      const bill = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'SPLIT',
        splitPayments: [
          { method: 'CASH', amount: 40 },
          { method: 'UPI', amount: 60, reference: 'UPI-SPLIT-55' }
        ]
      });

      // 40 Cash paid, 60 UPI unconfirmed
      expect(bill.payment_mode).toBe('SPLIT');
      expect(bill.payment_status).toBe('PARTIALLY_PAID');
      expect(bill.paid_amount).toBe('40.00');
      expect(bill.balance_due).toBe('60.00');
      expect(bill.payments[0].method).toBe('CASH');
      expect(bill.payments[0].status).toBe('PAID');
      expect(bill.payments[1].method).toBe('UPI');
      expect(bill.payments[1].status).toBe('PENDING_CONFIRMATION');
    });

    it('8. ensures mathematical consistency of balance due and invoice status across payment combinations', async () => {
      await db.products.put({ id: 501, name: 'Good Day Butter 100g', stock_quantity: 10 });

      // Scenario A: Full unconfirmed UPI
      const billA = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'UPI'
      });
      expect(parseFloat(billA.paid_amount) + parseFloat(billA.balance_due)).toBe(parseFloat(billA.grand_total));
      expect(billA.payment_status).toBe('PENDING_CONFIRMATION');

      // Scenario B: Full Cash
      const billB = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'CASH'
      });
      expect(parseFloat(billB.paid_amount) + parseFloat(billB.balance_due)).toBe(parseFloat(billB.grand_total));
      expect(billB.payment_status).toBe('PAID');

      // Scenario C: Split Cash + Credit
      const billC = await offlineInvoiceManager.createOfflineInvoice({
        cart: sampleCart,
        paymentMode: 'SPLIT',
        splitPayments: [
          { method: 'CASH', amount: 30 },
          { method: 'CREDIT', amount: 70 }
        ],
        selectedCustomer: { id: 90, name: 'Retailer X' }
      });
      expect(parseFloat(billC.paid_amount) + parseFloat(billC.balance_due)).toBe(parseFloat(billC.grand_total));
      expect(billC.payment_status).toBe('PARTIALLY_PAID');
    });
  });

  describe('9. Persistent Storage Initialization & Safety', () => {
    let originalStorage;

    beforeEach(() => {
      originalStorage = navigator.storage;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        configurable: true,
        writable: true
      });
    });

    it('9. handles persistent storage granted correctly', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          persist: vi.fn().mockResolvedValue(true),
          persisted: vi.fn().mockResolvedValue(false)
        },
        configurable: true,
        writable: true
      });

      const res = await initPersistentStorage();
      expect(res.supported).toBe(true);
      expect(res.persisted).toBe(true);
      expect(navigator.storage.persist).toHaveBeenCalled();
    });

    it('10. handles persistent storage denied safely without throwing errors', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: {
          persist: vi.fn().mockResolvedValue(false),
          persisted: vi.fn().mockResolvedValue(false)
        },
        configurable: true,
        writable: true
      });

      const res = await initPersistentStorage();
      expect(res.supported).toBe(true);
      expect(res.persisted).toBe(false);
    });

    it('11. safely handles browser environments without Storage API support', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        configurable: true,
        writable: true
      });

      const res = await initPersistentStorage();
      expect(res.supported).toBe(false);
      expect(res.persisted).toBe(false);
      expect(res.reason).toBe('STORAGE_API_UNSUPPORTED');
    });
  });
});
