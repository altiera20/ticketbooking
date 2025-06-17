/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format a date string
 * @param dateString - The date string to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const date = new Date(dateString);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  
  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(date);
};

/**
 * Format a date string to show only date (no time)
 * @param dateString - The date string to format
 * @returns Formatted date string without time
 */
export const formatDateOnly = (dateString: string): string => {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format a date string to show only time
 * @param dateString - The date string to format
 * @returns Formatted time string
 */
export const formatTimeOnly = (dateString: string): string => {
  return formatDate(dateString, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number with commas
 * @param num - The number to format
 * @returns Formatted number string with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Truncate a string to a specified length
 * @param str - The string to truncate
 * @param length - The maximum length
 * @returns Truncated string
 */
export const truncateString = (str: string, length = 100): string => {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
};
