/**
 * BUSINESSFLOW — Active Cart Recovery & Persistence
 * Preserves the in-progress POS billing cart across browser crashes, power cuts, or reloads.
 */

import { db } from './db.js';

const ACTIVE_CART_KEY = 'current_pos_cart';

export const cartPersistence = {
  /**
   * Save the active billing cart state into IndexedDB
   */
  async save({ cart, selectedCustomer, pricingMode, orderDiscount, paymentMode, splitPayments, notes }) {
    try {
      if (!cart || cart.length === 0) {
        // If cart is completely empty and no customer/notes, clear saved record
        if (!selectedCustomer && !notes) {
          await db.activeCart.delete(ACTIVE_CART_KEY).catch(() => {});
          return;
        }
      }

      await db.activeCart.put({
        key: ACTIVE_CART_KEY,
        cart: cart || [],
        selectedCustomer: selectedCustomer || null,
        pricingMode: pricingMode || 'WHOLESALE',
        orderDiscount: orderDiscount || 0,
        paymentMode: paymentMode || 'CASH',
        splitPayments: splitPayments || [],
        notes: notes || '',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[CartPersistence] Failed to persist active cart:', err);
    }
  },

  /**
   * Load preserved active billing cart from IndexedDB
   */
  async load() {
    try {
      const data = await db.activeCart.get(ACTIVE_CART_KEY);
      return data || null;
    } catch (err) {
      console.warn('[CartPersistence] Failed to load active cart:', err);
      return null;
    }
  },

  /**
   * Clear active cart from IndexedDB (e.g. after successful sale or clear)
   */
  async clear() {
    try {
      await db.activeCart.delete(ACTIVE_CART_KEY);
    } catch (err) {
      console.warn('[CartPersistence] Failed to clear active cart:', err);
    }
  }
};

