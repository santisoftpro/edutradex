import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, ApiTrade, TradeStats as ApiTradeStats } from '@/lib/api';

export type TradeDirection = 'UP' | 'DOWN';
export type TradeStatus = 'active' | 'won' | 'lost';
export type MarketType = 'forex' | 'otc';

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
  pollTradeStatus: (tradeId: string) => void;
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
        try {
          const stats = await api.getTradeStats();
          if (stats) {
            set({ stats });
          }
        } catch (error: unknown) {
          // Silently handle errors - don't propagate
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn('Failed to fetch stats:', errorMessage);
        }
      },

      pollTradeStatus: (tradeId: string) => {
        const trade = get().activeTrades.find((t) => t.id === tradeId);
        if (!trade) return;

        const expiresAt = new Date(trade.expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        if (timeUntilExpiry <= 0) {
          get().syncFromApi();
          return;
        }

        const pollDelay = timeUntilExpiry + 1000;

        setTimeout(async () => {
          try {
            const updatedTrade = await api.getTradeById(tradeId);
            if (updatedTrade && updatedTrade.status === 'CLOSED') {
              const mappedTrade = mapApiTradeToTrade(updatedTrade);

              set((state) => ({
                trades: state.trades.map((t) =>
                  t.id === tradeId ? mappedTrade : t
                ),
                activeTrades: state.activeTrades.filter((t) => t.id !== tradeId),
              }));

              get().fetchStats();
            } else {
              get().pollTradeStatus(tradeId);
            }
          } catch (error) {
            console.error('Failed to poll trade status:', error);
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

        try {
          await Promise.all([
            get().fetchTrades(),
            get().fetchActiveTrades(),
            get().fetchStats(),
          ]);
        } catch (error) {
          console.error('Failed to sync from API:', error);
        }
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
