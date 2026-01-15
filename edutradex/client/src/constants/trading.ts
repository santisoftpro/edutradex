/**
 * Trading Constants
 * Centralized configuration for trading-related values used across components
 */

// Duration options for trade expiration (in seconds)
export const TRADE_DURATIONS: { label: string; value: number }[] = [
  { label: '5s', value: 5 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

// Duration values array (for keyboard navigation)
export const DURATION_VALUES: number[] = TRADE_DURATIONS.map(d => d.value);

// Quick amount presets for trade amounts
export const QUICK_AMOUNTS: number[] = [5, 10, 25, 50, 100, 500, 1000, 5000];

// Trade thresholds
export const LARGE_TRADE_THRESHOLD = 500;

// Default trade values
export const DEFAULT_DURATION = 300; // 5 minutes
export const DEFAULT_AMOUNT = 10;

// LocalStorage keys for persisting user preferences
export const STORAGE_KEYS = {
  SELECTED_ASSET: 'optigobroker-selected-asset',
  SELECTED_DURATION: 'optigobroker-selected-duration',
  SELECTED_AMOUNT: 'optigobroker-selected-amount',
} as const;

// Display limits
export const MAX_VISIBLE_ACTIVE_TRADES = 4;
export const MAX_CLOSED_TRADES_HISTORY = 10;

// Timer intervals (in milliseconds)
export const TRADE_TIMER_INTERVAL = 100;

// Valid asset symbol pattern (forex pairs, OTC pairs, crypto)
const VALID_ASSET_PATTERN = /^[A-Z]{2,6}\/[A-Z]{2,6}(-OTC)?$|^[A-Z]{2,6}\/USDT(-OTC)?$/;

/**
 * Validate a stored asset symbol from localStorage
 * Returns the symbol if valid, or the default if invalid
 */
export function validateStoredAsset(storedValue: string | null, defaultAsset = 'EUR/USD'): string {
  if (!storedValue) return defaultAsset;

  // Check if it matches valid asset patterns
  if (VALID_ASSET_PATTERN.test(storedValue)) {
    return storedValue;
  }

  // Also allow simple crypto symbols
  if (/^[A-Z]{2,6}$/.test(storedValue)) {
    return storedValue;
  }

  return defaultAsset;
}

/**
 * Validate a stored duration from localStorage
 * Returns the duration if valid, or the default if invalid
 */
export function validateStoredDuration(storedValue: string | null): number {
  if (!storedValue) return DEFAULT_DURATION;

  const parsed = parseInt(storedValue, 10);

  // Check if it's a valid number and within our duration options
  if (isNaN(parsed) || parsed <= 0) {
    return DEFAULT_DURATION;
  }

  // Check if it's one of our predefined durations
  if (DURATION_VALUES.includes(parsed)) {
    return parsed;
  }

  // For custom durations, ensure it's within reasonable bounds (5s to 4h)
  if (parsed >= 5 && parsed <= 14400) {
    return parsed;
  }

  return DEFAULT_DURATION;
}

/**
 * Validate a stored amount from localStorage
 * Returns the amount if valid, or the default if invalid
 */
export function validateStoredAmount(storedValue: string | null): number {
  if (!storedValue) return DEFAULT_AMOUNT;

  const parsed = parseInt(storedValue, 10);

  // Check if it's a valid positive number
  if (isNaN(parsed) || parsed <= 0) {
    return DEFAULT_AMOUNT;
  }

  // Reasonable bounds: $1 to $100,000
  if (parsed >= 1 && parsed <= 100000) {
    return parsed;
  }

  return DEFAULT_AMOUNT;
}
