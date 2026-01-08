'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface TradingShortcutsConfig {
  onBuy: () => void;
  onSell: () => void;
  onAmountSelect?: (amount: number) => void;
  onDurationSelect?: (index: number) => void;
  amounts?: number[];
  enabled?: boolean;
}

/**
 * Keyboard shortcuts for trading:
 * - W or ArrowUp: BUY (UP)
 * - S or ArrowDown: SELL (DOWN)
 * - 1-8: Quick amount selection
 * - Q/E: Decrease/Increase duration
 * - Escape: Close any open modals
 */
export function useTradingShortcuts({
  onBuy,
  onSell,
  onAmountSelect,
  onDurationSelect,
  amounts = [5, 10, 25, 50, 100, 500, 1000, 5000],
  enabled = true,
}: TradingShortcutsConfig) {
  const lastKeyTime = useRef<number>(0);
  const DEBOUNCE_MS = 200; // Prevent accidental double-triggers

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Debounce rapid key presses
      const now = Date.now();
      if (now - lastKeyTime.current < DEBOUNCE_MS) {
        return;
      }

      const key = event.key.toLowerCase();

      // BUY shortcuts: W or ArrowUp
      if (key === 'w' || event.key === 'ArrowUp') {
        event.preventDefault();
        lastKeyTime.current = now;
        onBuy();
        return;
      }

      // SELL shortcuts: S or ArrowDown
      if (key === 's' || event.key === 'ArrowDown') {
        event.preventDefault();
        lastKeyTime.current = now;
        onSell();
        return;
      }

      // Quick amount selection: 1-8
      if (onAmountSelect && /^[1-8]$/.test(key)) {
        event.preventDefault();
        const index = parseInt(key, 10) - 1;
        if (index < amounts.length) {
          onAmountSelect(amounts[index]);
        }
        return;
      }

      // Duration navigation: Q (previous) / E (next)
      if (onDurationSelect) {
        if (key === 'q') {
          event.preventDefault();
          onDurationSelect(-1); // Previous duration
          return;
        }
        if (key === 'e') {
          event.preventDefault();
          onDurationSelect(1); // Next duration
          return;
        }
      }
    },
    [enabled, onBuy, onSell, onAmountSelect, onDurationSelect, amounts]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

// Shortcut labels for UI display
export const TRADING_SHORTCUTS = {
  buy: { keys: ['W', '↑'], label: 'BUY' },
  sell: { keys: ['S', '↓'], label: 'SELL' },
  amounts: { keys: ['1-8'], label: 'Quick Amount' },
  duration: { keys: ['Q/E'], label: 'Duration ±' },
} as const;
