import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return 'Invalid date';
  return format(parsed, 'MMM d, yyyy HH:mm');
}

/**
 * Extract a user-friendly error message from various error types
 * Handles Axios errors, fetch errors, network errors, and standard Error objects
 */
export function getErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return 'An unexpected error occurred';
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object') {
    // Type assertion for common error shapes
    const err = error as {
      response?: { data?: { error?: string; message?: string }; status?: number };
      message?: string;
      code?: string;
      name?: string;
    };

    // Check for Axios error response first (has response.data with error message)
    if (err.response?.data?.error) {
      return err.response.data.error;
    }
    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    // Handle HTTP status codes for Axios errors without messages
    if (err.response?.status) {
      const status = err.response.status;
      if (status === 401) return 'Please log in to continue';
      if (status === 403) return 'You do not have permission to perform this action';
      if (status === 404) return 'The requested resource was not found';
      if (status === 429) return 'Too many requests. Please wait a moment and try again';
      if (status >= 500) return 'Server error. Please try again later';
    }

    // Handle network errors (Axios)
    if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
      return 'Unable to connect to server. Please check your connection';
    }

    // Handle timeout errors
    if (err.code === 'ECONNABORTED' || err.name === 'TimeoutError') {
      return 'Request timed out. Please try again';
    }

    // Handle abort errors
    if (err.name === 'AbortError') {
      return 'Request was cancelled';
    }

    // Fallback to error.message for regular Error objects
    if (err.message) {
      // Don't show generic axios status code messages
      if (err.message.startsWith('Request failed with status code')) {
        return 'An error occurred. Please try again.';
      }
      // Don't expose technical error messages
      if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
        return 'Unable to connect to server. Please check your connection';
      }
      return err.message;
    }
  }

  // Handle Error instances directly
  if (error instanceof Error) {
    if (error.message.startsWith('Request failed with status code')) {
      return 'An error occurred. Please try again.';
    }
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Check if an error indicates a network/connection issue
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as { code?: string; message?: string; name?: string };
    return (
      err.code === 'ERR_NETWORK' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ECONNABORTED' ||
      err.name === 'TimeoutError' ||
      err.message?.includes('Network Error') ||
      false
    );
  }
  return false;
}

export type MarketType = 'forex' | 'crypto' | 'stock' | 'index';

/**
 * Determine market type from symbol name
 * Centralized logic to ensure consistency across the application
 */
export function getMarketType(symbol: string): MarketType {
  // Crypto symbols - typically end with /USDT or contain major crypto names
  if (symbol.endsWith('/USDT') || symbol.endsWith('-OTC') && (
    symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') ||
    symbol.includes('XRP') || symbol.includes('BNB') || symbol.includes('ADA') ||
    symbol.includes('DOGE') || symbol.includes('DOT') || symbol.includes('LTC') ||
    symbol.includes('LINK')
  )) {
    return 'crypto';
  }

  // Check for OTC crypto symbols
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL') ||
      symbol.includes('XRP') || symbol.includes('BNB') || symbol.includes('DOGE')) {
    return 'crypto';
  }

  // Index symbols
  const indexSymbols = ['SPX500', 'NASDAQ', 'DJI', 'DAX', 'FTSE100', 'NIKKEI', 'CAC40', 'ASX200'];
  if (indexSymbols.some(idx => symbol.includes(idx))) {
    return 'index';
  }

  // Stock symbols (typically 1-5 uppercase letters without slash)
  if (/^[A-Z]{1,5}$/.test(symbol)) {
    return 'stock';
  }

  // Default to forex (currency pairs like EUR/USD, EUR/USD-OTC)
  return 'forex';
}

/**
 * Create a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Check if a specific market type is currently open
 * - Crypto: 24/7
 * - Forex: Sunday 5PM ET to Friday 5PM ET (closed weekends)
 * - Stocks: Weekdays 9:30AM - 4PM ET
 * - Indices: Same as stocks
 */
export function isMarketOpen(marketType: MarketType): boolean {
  const now = new Date();

  // Get current time in ET (Eastern Time)
  const etOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false
  };
  const etFormatter = new Intl.DateTimeFormat('en-US', etOptions);
  const parts = etFormatter.formatToParts(now);

  const weekday = parts.find(p => p.type === 'weekday')?.value || '';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const timeInMinutes = hour * 60 + minute;

  // Crypto is always open 24/7
  if (marketType === 'crypto') {
    return true;
  }

  // Forex: Open Sunday 5PM ET to Friday 5PM ET
  if (marketType === 'forex') {
    const forexOpenTime = 17 * 60; // 5:00 PM = 1020 minutes

    if (weekday === 'Sat') {
      return false; // Saturday - closed
    }
    if (weekday === 'Sun') {
      return timeInMinutes >= forexOpenTime; // Sunday opens at 5PM ET
    }
    if (weekday === 'Fri') {
      return timeInMinutes < forexOpenTime; // Friday closes at 5PM ET
    }
    // Mon-Thu: Open 24 hours
    return true;
  }

  // Stocks & Indices: Weekdays 9:30 AM - 4:00 PM ET
  if (marketType === 'stock' || marketType === 'index') {
    const marketOpen = 9 * 60 + 30;  // 9:30 AM = 570 minutes
    const marketClose = 16 * 60;     // 4:00 PM = 960 minutes

    // Weekend - closed
    if (weekday === 'Sat' || weekday === 'Sun') {
      return false;
    }

    // Check if within trading hours
    return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
  }

  return true;
}

/**
 * Get market status text
 */
export function getMarketStatus(marketType: MarketType): { isOpen: boolean; statusText: string } {
  const isOpen = isMarketOpen(marketType);

  if (isOpen) {
    return { isOpen, statusText: 'Open' };
  }

  if (marketType === 'forex') {
    return { isOpen, statusText: 'Closed (Weekend)' };
  }
  if (marketType === 'stock' || marketType === 'index') {
    const now = new Date();
    const etOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/New_York', weekday: 'short' };
    const weekday = new Intl.DateTimeFormat('en-US', etOptions).format(now);

    if (weekday === 'Sat' || weekday === 'Sun') {
      return { isOpen, statusText: 'Closed (Weekend)' };
    }
    return { isOpen, statusText: 'Closed (After Hours)' };
  }

  return { isOpen, statusText: 'Closed' };
}
