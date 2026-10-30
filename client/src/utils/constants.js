/**
 * BUSINESSFLOW — Global Frontend Constants & Enums
 */

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF'
};

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Credit/Debit Card' },
  { value: 'UPI', label: 'UPI / QR Code' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'STORE_CREDIT', label: 'Store Credit' },
  { value: 'OTHER', label: 'Other' }
];

export const PAYMENT_STATUSES = {
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partially Paid', variant: 'warning' },
  UNPAID: { label: 'Unpaid', variant: 'error' }
};

export const SALE_STATUSES = {
  COMPLETED: { label: 'Completed', variant: 'success' },
  PARTIALLY_REFUNDED: { label: 'Partially Refunded', variant: 'warning' },
  REFUNDED: { label: 'Refunded', variant: 'neutral' },
  CANCELLED: { label: 'Cancelled', variant: 'error' }
};

export const DEFAULT_CURRENCY = {
  code: 'USD',
  symbol: '$'
};
