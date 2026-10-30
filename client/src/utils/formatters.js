/**
 * BUSINESSFLOW — Frontend Formatting Utilities
 */

/**
 * Formats a numeric value into currency format with symbol
 * @param {number|string} amount
 * @param {string} [symbol='$']
 * @param {number} [decimals=2]
 * @returns {string}
 */
export const formatCurrency = (amount, symbol = '$', decimals = 2) => {
  const num = parseFloat(amount) || 0;
  return `${symbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};

/**
 * Formats an ISO date string or Date object into human-readable date
 * @param {string|Date} date
 * @param {object} [options]
 * @returns {string}
 */
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  return d.toLocaleDateString('en-US', defaultOptions);
};

/**
 * Formats a date with time
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formats a number with comma separators
 * @param {number|string} num
 * @returns {string}
 */
export const formatNumber = (num) => {
  const val = parseFloat(num) || 0;
  return val.toLocaleString('en-US');
};
