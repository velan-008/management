/**
 * BUSINESSFLOW — IndexedDB Offline Database Schema
 * Powered by Dexie.js for resilient local storage.
 * Stores master data caches, cart recovery state, and offline synchronization queues.
 */

import Dexie from 'dexie';

export const db = new Dexie('BusinessflowPOS_DB');

db.version(1).stores({
  // Master data caches
  products: 'id, barcode, sku, name, category_id, is_active',
  categories: 'id, name, is_active',
  customers: 'id, name, phone, customer_type, is_active',
  businessSettings: 'key',

  // Active cart persistence & recovery
  activeCart: 'key, updatedAt',

  // Offline invoice storage (for Phase 2 queueing)
  offlineInvoices: 'local_bill_id, invoice_number, status, created_at, idempotency_key',

  // Synchronization queue & operational audit logs
  syncQueue: 'id, type, status, created_at, retry_count',
  syncLogs: '++id, timestamp, action, status'
});

/**
 * Log an event to syncLogs store
 */
export async function logSyncEvent(action, status, details = {}) {
  try {
    await db.syncLogs.add({
      timestamp: new Date().toISOString(),
      action,
      status,
      details
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to write sync log:', err);
  }
}

/**
 * Get storage statistics (record counts across stores)
 */
export async function getStorageStats() {
  try {
    const [productsCount, categoriesCount, customersCount, pendingInvoicesCount, syncQueueCount] =
      await Promise.all([
        db.products.count(),
        db.categories.count(),
        db.customers.count(),
        db.offlineInvoices.where('status').equals('PENDING').count().catch(() => 0),
        db.syncQueue.where('status').equals('PENDING').count().catch(() => 0)
      ]);

    return {
      products: productsCount,
      categories: categoriesCount,
      customers: customersCount,
      pendingInvoices: pendingInvoicesCount,
      syncQueue: syncQueueCount
    };
  } catch (err) {
    console.error('[IndexedDB] Failed to read storage stats:', err);
    return {
      products: 0,
      categories: 0,
      customers: 0,
      pendingInvoices: 0,
      syncQueue: 0
    };
  }
}

/**
 * Request persistent storage from the browser to reduce eviction risk under storage pressure.
 * Note: Persistent storage protects against automatic browser eviction, but cannot protect
 * against intentional user clearing of browsing/site data or hardware failure.
 *
 * @returns {Promise<{ supported: boolean, persisted: boolean, reason?: string, error?: string, alreadyPersisted?: boolean }>}
 */
export async function initPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.persist !== 'function') {
    return { supported: false, persisted: false, reason: 'STORAGE_API_UNSUPPORTED' };
  }

  try {
    if (typeof navigator.storage.persisted === 'function') {
      const alreadyPersisted = await navigator.storage.persisted();
      if (alreadyPersisted) {
        return { supported: true, persisted: true, alreadyPersisted: true };
      }
    }

    const isPersisted = await navigator.storage.persist();
    if (isPersisted) {
      console.info('[Storage] Persistent storage granted by browser.');
    } else {
      console.warn('[Storage] Persistent storage denied by browser. Storage may be evicted under heavy disk pressure.');
    }
    return { supported: true, persisted: Boolean(isPersisted) };
  } catch (err) {
    console.warn('[Storage] Persistent storage request encountered an error:', err);
    return { supported: true, persisted: false, error: err.message };
  }
}

// Safely request persistent storage in browser environments without blocking startup
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  try {
    initPersistentStorage().catch(() => {});
  } catch {
    // Non-blocking initialization
  }
}


