import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { api, ApiTrade, TradeStats as ApiTradeStats } from '@/lib/api';
import { playWinSound, playLoseSound } from '@/lib/sounds';

// Throttle state for preventing rapid API calls
let lastStatsTime = 0;
let lastSyncTime = 0;
let pendingStats: Promise<void> | null = null;
let pendingSync: Promise<void> | null = null;
const STATS_THROTTLE_MS = 3000; // Minimum 3 seconds between stats fetches
const SYNC_THROTTLE_MS = 5000; // Minimum 5 seconds between full syncs

// Track trades that have already shown notifications (prevents duplicates)
const notifiedTrades = new Set<string>();

export type TradeDirection = 'UP' | 'DOWN';
export type TradeStatus = 'active' | 'won' | 'lost';
export type MarketType = 'forex' | 'crypto' | 'stock' | 'index';

export type AccountType = 'LIVE' | 'DEMO';

export interface Trade {
  id: string;
  symbol: string;
  direction: TradeDirection;
  amount: number;
  duration: number;
  entryPrice: number;
  exitPrice?: number;
  payout: number;
  profit?: number;
  status: TradeStatus;
  marketType: MarketType;
  accountType: AccountType; // Which account this trade was placed from
  createdAt: string;
  expiresAt: string;
  closedAt?: string;
}

interface TradeStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  totalProfit: number;
  winRate: number;
}

interface TradeState {
  trades: Trade[];
  activeTrades: Trade[];
  stats: TradeStats;
  isLoading: boolean;
  pollingTrades: Set<string>; // Track which trades are being polled

  placeTrade: (trade: {
    symbol: string;
    direction: TradeDirection;
    amount: number;
    duration: number;
    entryPrice: number;
    marketType: MarketType;
  }) => Promise<Trade>;
  fetchTrades: () => Promise<void>;
  fetchActiveTrades: () => Promise<void>;
  fetchStats: () => Promise<void>;
  pollTradeStatus: (tradeId: string, retryCount?: number) => void;
  clearHistory: () => Promise<void>;
  syncFromApi: () => Promise<void>;
}

function mapApiTradeToTrade(apiTrade: ApiTrade): Trade {
  const status: TradeStatus =
    apiTrade.status === 'OPEN'
      ? 'active'
      : apiTrade.result === 'WON'
      ? 'won'
      : 'lost';

  return {
    id: apiTrade.id,
    symbol: apiTrade.symbol,
    direction: apiTrade.direction,
    amount: apiTrade.amount,
    duration: apiTrade.duration,
    entryPrice: apiTrade.entryPrice,
    exitPrice: apiTrade.exitPrice ?? undefined,
    payout: apiTrade.payoutPercent,
    profit: apiTrade.profit ?? undefined,
    status,
    marketType: apiTrade.market.toLowerCase() as MarketType,
    accountType: apiTrade.accountType ?? 'DEMO', // Fallback for backwards compatibility
    createdAt: apiTrade.openedAt,
    expiresAt: apiTrade.expiresAt,
    closedAt: apiTrade.closedAt ?? undefined,
  };
}

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      trades: [],
      activeTrades: [],
      stats: {
        totalTrades: 0,
        wonTrades: 0,
        lostTrades: 0,
        totalProfit: 0,
        winRate: 0,
      },
      isLoading: false,
      pollingTrades: new Set<string>(),

      placeTrade: async (tradeData) => {
        // Don't set global isLoading - allows rapid multiple trades
        const apiTrade = await api.placeTrade({
          symbol: tradeData.symbol,
          direction: tradeData.direction,
          amount: tradeData.amount,
          duration: tradeData.duration,
          entryPrice: tradeData.entryPrice,
          marketType: tradeData.marketType,
        });

        const trade = mapApiTradeToTrade(apiTrade);

        set((state) => ({
          trades: [trade, ...state.trades],
          activeTrades: [trade, ...state.activeTrades],
        }));

        get().pollTradeStatus(trade.id);

        return trade;
      },

      fetchTrades: async () => {
        try {
          const result = await api.getTrades({ limit: 100 });
          if (result?.trades) {
            const trades = result.trades.map(mapApiTradeToTrade);
            set({ trades });
          }
        } catch (error: unknown) {
          // Silently handle errors - don't propagate
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Failed to fetch trades:', errorMessage);
        }
      },

      fetchActiveTrades: async () => {
        try {
          const apiTrades = await api.getActiveTrades();
          if (apiTrades && Array.isArray(apiTrades)) {
            const activeTrades = apiTrades.map(mapApiTradeToTrade);
            set({ activeTrades });

            activeTrades.forEach((trade) => {
              get().pollTradeStatus(trade.id);
            });
          }
        } catch (error: unknown) {
          // Silently handle errors - don't propagate
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Failed to fetch active trades:', errorMessage);
        }
      },

      fetchStats: async () => {
        const now = Date.now();

        // If there's a pending fetch, return that promise
        if (pendingStats) {
          return pendingStats;
        }

        // Throttle: skip if called too recently
        if (now - lastStatsTime < STATS_THROTTLE_MS) {
          return;
        }

        lastStatsTime = now;

        pendingStats = (async () => {
          try {
            const stats = await api.getTradeStats();
            if (stats) {
              set({ stats });
            }
          } catch (error: unknown) {
            // Silently handle errors - don't propagate
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('Failed to fetch stats:', errorMessage);
          } finally {
            pendingStats = null;
          }
        })();

        return pendingStats;
      },

      pollTradeStatus: (tradeId: string, retryCount = 0) => {
        const MAX_RETRIES = 10;
        const { activeTrades, pollingTrades } = get();

        // Prevent duplicate polling for the same trade
        if (retryCount === 0 && pollingTrades.has(tradeId)) {
          console.log(`Already polling trade ${tradeId}, skipping duplicate`);
          return;
        }

        const trade = activeTrades.find((t) => t.id === tradeId);
        if (!trade) {
          // Trade not found, remove from polling set if present
          if (pollingTrades.has(tradeId)) {
            const newPollingTrades = new Set(pollingTrades);
            newPollingTrades.delete(tradeId);
            set({ pollingTrades: newPollingTrades });
          }
          return;
        }

        // Add to polling set on first call
        if (retryCount === 0) {
          const newPollingTrades = new Set(pollingTrades);
          newPollingTrades.add(tradeId);
          set({ pollingTrades: newPollingTrades });
        }

        // Stop polling after max retries
        if (retryCount >= MAX_RETRIES) {
          console.warn(`Max retries reached for trade ${tradeId}`);
          // Remove from polling set
          const newPollingTrades = new Set(get().pollingTrades);
          newPollingTrades.delete(tradeId);
          set({ pollingTrades: newPollingTrades });
          get().syncFromApi();
          return;
        }

        const expiresAt = new Date(trade.expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Calculate poll delay with exponential backoff after expiry
        let pollDelay: number;
        if (timeUntilExpiry > 0) {
          // Before expiry: wait until expiry + small buffer
          pollDelay = timeUntilExpiry + 500;
        } else {
          // After expiry: exponential backoff (1s, 2s, 4s, 8s... max 10s)
          pollDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        }

        setTimeout(async () => {
          try {
            const updatedTrade = await api.getTradeById(tradeId);
            if (updatedTrade && updatedTrade.status === 'CLOSED') {
              const mappedTrade = mapApiTradeToTrade(updatedTrade);
              const won = updatedTrade.result === 'WON';
              const profit = updatedTrade.profit ?? 0;

              // Remove from polling set and update trade state
              const newPollingTrades = new Set(get().pollingTrades);
              newPollingTrades.delete(tradeId);

              set((state) => ({
                trades: state.trades.map((t) =>
                  t.id === tradeId ? mappedTrade : t
                ),
                activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
                pollingTrades: newPollingTrades,
              }));

              // Show notification only if not already notified (prevents duplicates from WebSocket)
              if (markTradeNotified(tradeId)) {
                console.log('[Polling] Trade settled via polling:', { tradeId, won, profit });
                if (won) {
                  playWinSound();
                  toast.success(`Profit +$${profit.toFixed(2)} on ${updatedTrade.symbol}`, { duration: 4000 });
                } else {
                  playLoseSound();
                  toast.error(`Loss -$${updatedTrade.amount.toFixed(2)} on ${updatedTrade.symbol}`, { duration: 4000 });
                }
              }

              // Fetch stats in background (don't block)
              get().fetchStats();
            } else {
              // Retry with incremented count (don't add to polling set again)
              get().pollTradeStatus(tradeId, retryCount + 1);
            }
          } catch (error) {
            console.error('Failed to poll trade status:', error);
            // Retry on error with incremented count
            get().pollTradeStatus(tradeId, retryCount + 1);
          }
        }, pollDelay);
      },

      clearHistory: async () => {
        try {
          await api.clearTradeHistory();
          set({
            trades: get().activeTrades,
            stats: {
              totalTrades: 0,
              wonTrades: 0,
              lostTrades: 0,
              totalProfit: 0,
              winRate: 0,
            },
          });
        } catch (error) {
          console.error('Failed to clear history:', error);
          throw error;
        }
      },

      syncFromApi: async () => {
        // Only sync if we have a token (user is authenticated)
        const token = api.getToken();
        if (!token) {
          console.warn('syncFromApi skipped: No auth token available');
          return;
        }

        const now = Date.now();

        // If there's a pending sync, return that promise
        if (pendingSync) {
          return pendingSync;
        }

        // Throttle: skip if called too recently
        if (now - lastSyncTime < SYNC_THROTTLE_MS) {
          return;
        }

        lastSyncTime = now;

        pendingSync = (async () => {
          try {
            await Promise.all([
              get().fetchTrades(),
              get().fetchActiveTrades(),
              get().fetchStats(),
            ]);
          } catch (error) {
            console.error('Failed to sync from API:', error);
          } finally {
            pendingSync = null;
          }
        })();

        return pendingSync;
      },
    }),
    {
      name: 'optigobroker-trades',
      partialize: (state) => ({
        trades: state.trades,
        activeTrades: state.activeTrades,
        stats: state.stats,
      }),
    }
  )
);

// Helper functions for notification deduplication
export function markTradeNotified(tradeId: string): boolean {
  if (notifiedTrades.has(tradeId)) {
    return false; // Already notified
  }
  notifiedTrades.add(tradeId);
  // Clean up after 1 minute
  setTimeout(() => notifiedTrades.delete(tradeId), 60000);
  return true; // First notification
}

export function isTradeNotified(tradeId: string): boolean {
  return notifiedTrades.has(tradeId);
}
