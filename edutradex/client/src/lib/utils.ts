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

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { error?: string; message?: string } } };
    return err.response?.data?.error || err.response?.data?.message || 'An error occurred';
  }
  return 'An unexpected error occurred';
}

export type MarketType = 'forex' | 'crypto' | 'stock' | 'index';

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
