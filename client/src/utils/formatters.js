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

/**
 * Converts a numeric amount to Indian currency words
 * e.g. 1250.50 -> "One Thousand Two Hundred Fifty Rupees and Fifty Paise Only"
 * @param {number|string} num
 * @returns {string}
 */
export const numberToWords = (num) => {
  const n = parseFloat(num);
  if (isNaN(n) || n <= 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (number) => {
    let current = '';
    if (number >= 100) {
      current += ones[Math.floor(number / 100)] + ' Hundred ';
      number %= 100;
    }
    if (number >= 20) {
      current += tens[Math.floor(number / 10)] + ' ';
      number %= 10;
    }
    if (number > 0) {
      current += ones[number] + ' ';
    }
    return current;
  };

  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  let result = '';
  const crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) {
    result += convertLessThanOneThousand(crore).trim() + ' Crore ';
  }
  if (lakh > 0) {
    result += convertLessThanOneThousand(lakh).trim() + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertLessThanOneThousand(thousand).trim() + ' Thousand ';
  }
  if (remainder > 0) {
    result += convertLessThanOneThousand(remainder).trim();
  }

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ' and ' + convertLessThanOneThousand(decimalPart).trim() + ' Paise';
  }

  return result + ' Only';
};
