/**
 * BUSINESSFLOW — Online / Offline & Backend Availability Monitor
 * Differentiates between:
 * - ONLINE (Backend reachable, MySQL UP)
 * - DEGRADED (Backend reachable, MySQL DOWN)
 * - SERVER_DOWN (Network available, backend unreachable)
 * - OFFLINE (No internet/network interface)
 */

import api from '../services/api.js';

export const CONNECTION_STATUS = {
  ONLINE: 'ONLINE',
  DEGRADED: 'DEGRADED',
  SERVER_DOWN: 'SERVER_DOWN',
  OFFLINE: 'OFFLINE'
};

class ConnectionManager {
  constructor() {
    this.status = typeof navigator !== 'undefined' && navigator.onLine ? CONNECTION_STATUS.ONLINE : CONNECTION_STATUS.OFFLINE;
    this.listeners = new Set();
    this.checkTimer = null;
    this.isChecking = false;
    this.lastCheckedAt = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.checkHealth(true);
      });

      window.addEventListener('offline', () => {
        this.updateStatus(CONNECTION_STATUS.OFFLINE, 'Browser reported offline');
      });

      window.addEventListener('focus', () => {
        // Run quick health check if last check was > 15s ago
        if (!this.lastCheckedAt || Date.now() - this.lastCheckedAt > 15000) {
          this.checkHealth();
        }
      });

      // Start periodic health checks (interval 30s when online, 10s when disconnected)
      this.scheduleNextCheck();
    }
  }

  scheduleNextCheck() {
    if (this.checkTimer) clearTimeout(this.checkTimer);
    const interval = this.status === CONNECTION_STATUS.ONLINE ? 30000 : 10000;
    this.checkTimer = setTimeout(() => {
      this.checkHealth();
    }, interval);
  }

  updateStatus(newStatus, reason = '') {
    const prevStatus = this.status;
    this.status = newStatus;
    this.lastCheckedAt = Date.now();

    if (prevStatus !== newStatus) {
      console.info(`[Connection] Status changed: ${prevStatus} -> ${newStatus} (${reason})`);
      this.listeners.forEach((listener) => {
        try {
          listener(this.status, { prevStatus, reason });
        } catch (err) {
          console.error('[Connection] Listener error:', err);
        }
      });
    }

    this.scheduleNextCheck();
  }

  async checkHealth(force = false) {
    if (this.isChecking && !force) return;
    this.isChecking = true;

    // Check navigator.onLine if available
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' && !navigator.onLine) {
      this.isChecking = false;
      this.updateStatus(CONNECTION_STATUS.OFFLINE, 'Navigator offline');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const dbStatus = data?.data?.database || data?.database;
        if (dbStatus === 'DOWN') {
          this.updateStatus(CONNECTION_STATUS.DEGRADED, 'Database connection is DOWN');
        } else {
          this.updateStatus(CONNECTION_STATUS.ONLINE, 'Backend and database operational');
        }
      } else if (response.status === 503) {
        this.updateStatus(CONNECTION_STATUS.DEGRADED, 'Service degraded: Database unavailable');
      } else {
        this.updateStatus(CONNECTION_STATUS.SERVER_DOWN, `Server returned HTTP ${response.status}`);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        this.updateStatus(CONNECTION_STATUS.SERVER_DOWN, 'Health check timed out');
      } else if (typeof navigator !== 'undefined' && !navigator.onLine) {
        this.updateStatus(CONNECTION_STATUS.OFFLINE, 'Network disconnected');
      } else {
        this.updateStatus(CONNECTION_STATUS.SERVER_DOWN, 'Backend unreachable');
      }
    } finally {
      this.isChecking = false;
    }
  }

  getStatus() {
    return this.status;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately emit current status
    listener(this.status, { prevStatus: this.status, reason: 'initial' });
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const connectionManager = new ConnectionManager();
