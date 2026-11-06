/**
 * BUSINESSFLOW — Offline Synchronization Engine
 * Handles background & manual sync of queued offline bills with MySQL backend.
 * Provides atomic status transitions, conflict logging, and master data reconciliation.
 */

import { db, logSyncEvent } from './db.js';
import { offlineInvoiceManager } from './offlineInvoiceManager.js';
import { connectionManager, CONNECTION_STATUS } from './connectionManager.js';
import { invoiceService, productService, customerService } from '../services/businessServices.js';
import { masterDataCache } from './masterDataCache.js';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.pendingCount = 0;
    this.lastSyncAt = null;
    this.listeners = new Set();

    if (typeof window !== 'undefined') {
      // Refresh pending count on initialization
      this.refreshPendingCount();

      // Automatically trigger sync when connectivity is restored to ONLINE
      connectionManager.subscribe((status, { prevStatus }) => {
        if (status === CONNECTION_STATUS.ONLINE && prevStatus !== CONNECTION_STATUS.ONLINE) {
          console.info('[SyncManager] Connection restored to ONLINE. Triggering auto-sync...');
          setTimeout(() => {
            this.syncAllPending();
          }, 1500);
        }
      });
    }
  }

  async refreshPendingCount() {
    try {
      const count = await db.syncQueue.where('status').equals('PENDING').count();
      this.pendingCount = count;
      this.notifyListeners();
      return count;
    } catch {
      return 0;
    }
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener({
          isSyncing: this.isSyncing,
          pendingCount: this.pendingCount,
          lastSyncAt: this.lastSyncAt
        });
      } catch (err) {
        console.error('[SyncManager] Listener error:', err);
      }
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncAt: this.lastSyncAt
    });
    return () => this.listeners.delete(listener);
  }

  /**
   * Synchronize all pending offline bills with MySQL backend
   */
  async syncAllPending() {
    if (this.isSyncing) {
      return { skipped: true, reason: 'Already in progress' };
    }

    if (connectionManager.getStatus() !== CONNECTION_STATUS.ONLINE) {
      await this.refreshPendingCount();
      return { skipped: true, reason: 'Not online' };
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const pendingTasks = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .toArray();

      if (pendingTasks.length === 0) {
        this.isSyncing = false;
        await this.refreshPendingCount();
        return { total: 0, synced: 0 };
      }

      console.info(`[SyncManager] Syncing ${pendingTasks.length} pending offline bills...`);
      const invoicesPayload = pendingTasks.map((t) => t.payload);

      const response = await invoiceService.syncBatch({ invoices: invoicesPayload });
      const results = response.data?.results || [];

      let syncedCount = 0;
      let failedCount = 0;

      for (const res of results) {
        const localBillId = res.local_bill_id;
        if (res.status === 'SYNCED' || res.status === 'ALREADY_SYNCED') {
          syncedCount++;
          await offlineInvoiceManager.markAsSynced(localBillId, {
            id: res.invoice_id,
            invoice_id: res.invoice_id,
            invoice_number: res.invoice_number
          });
        } else if (res.status === 'FAILED') {
          failedCount++;
          const currentTask = pendingTasks.find((t) => t.id === localBillId);
          const currentRetries = (currentTask?.retry_count || 0) + 1;

          await db.syncQueue.update(localBillId, {
            retry_count: currentRetries,
            status: currentRetries >= 5 ? 'CONFLICT' : 'PENDING',
            last_error: res.error,
            last_attempt_at: new Date().toISOString()
          });

          await logSyncEvent('BILL_SYNC_FAILED', 'ERROR', {
            localBillId,
            error: res.error,
            retryCount: currentRetries
          });
        }
      }

      // Reconcile master data cache with updated server inventory & customers
      if (syncedCount > 0) {
        try {
          const [prodRes, custRes] = await Promise.all([
            productService.list({ limit: 100, is_active: true }),
            customerService.list({ limit: 50 })
          ]);
          if (prodRes.data?.products) {
            await masterDataCache.cacheProducts(prodRes.data.products);
          }
          if (custRes.data?.customers) {
            await masterDataCache.cacheCustomers(custRes.data.customers);
          }
        } catch (reconcileErr) {
          console.warn('[SyncManager] Post-sync cache reconciliation warning:', reconcileErr);
        }
      }

      this.lastSyncAt = new Date();
      await this.refreshPendingCount();

      return {
        total: pendingTasks.length,
        synced: syncedCount,
        failed: failedCount
      };
    } catch (err) {
      console.error('[SyncManager] Sync batch request error:', err);
      await this.refreshPendingCount();
      return { total: 0, synced: 0, error: err.message };
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }
}

export const syncManager = new SyncManager();

