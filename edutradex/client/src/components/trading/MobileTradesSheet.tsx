'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  History,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Search,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { useFilteredActiveTrades, useFilteredTrades, Trade } from '@/store/trade.store';
import { PriceTick } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MobileTradesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  latestPrices: Map<string, PriceTick>;
}

type TabType = 'opened' | 'closed';

function formatPrice(price: number, symbol: string): string {
  const isJPYPair = symbol.includes('JPY');
  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH') || price > 100;
  if (isCrypto) return price.toFixed(2);
  return price.toFixed(isJPYPair ? 3 : 5);
}

export function MobileTradesSheet({ isOpen, onClose, latestPrices }: MobileTradesSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('opened');
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const activeTrades = useFilteredActiveTrades();
  const allTrades = useFilteredTrades();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get closed trades from the last 24 hours only (max 20)
  const closedTrades = useMemo(() => {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return allTrades
      .filter(t => {
        if (t.status !== 'won' && t.status !== 'lost') return false;
        const closedTime = new Date(t.closedAt || t.createdAt).getTime();
        return closedTime > twentyFourHoursAgo;
      })
      .slice(0, 20);
  }, [allTrades]);

  // Calculate summary stats for history
  const historyStats = useMemo(() => {
    const wins = closedTrades.filter(t => t.status === 'won').length;
    const losses = closedTrades.filter(t => t.status === 'lost').length;
    const totalPL = closedTrades.reduce((acc, t) => {
      if (t.status === 'won') return acc + (t.profit || 0);
      return acc - t.amount;
    }, 0);
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
    return { wins, losses, totalPL, winRate, total: closedTrades.length };
  }, [closedTrades]);

  const searchedActiveTrades = useMemo(() => {
    if (!searchQuery.trim()) return activeTrades;
    const query = searchQuery.toLowerCase().trim();
    return activeTrades.filter((trade) => trade.symbol.toLowerCase().includes(query));
  }, [activeTrades, searchQuery]);

  const searchedClosedTrades = useMemo(() => {
    if (!searchQuery.trim()) return closedTrades;
    const query = searchQuery.toLowerCase().trim();
    return closedTrades.filter((trade) => trade.symbol.toLowerCase().includes(query));
  }, [closedTrades, searchQuery]);

  if (!isOpen || !isClient) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#12121f] rounded-t-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-8 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-white font-semibold text-base">My Trades</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#1e1e32] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 mb-3">
          <button
            onClick={() => setActiveTab('opened')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
              activeTab === 'opened'
                ? 'bg-blue-500 text-white'
                : 'bg-[#1a1a2e] text-gray-400'
            )}
          >
            <Clock className="h-4 w-4" />
            Open
            {activeTrades.length > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] rounded-full font-bold min-w-[18px]',
                activeTab === 'opened' ? 'bg-white/20' : 'bg-blue-500 text-white'
              )}>
                {activeTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
              activeTab === 'closed'
                ? 'bg-slate-600 text-white'
                : 'bg-[#1a1a2e] text-gray-400'
            )}
          >
            <History className="h-4 w-4" />
            History
          </button>
        </div>

        {/* Summary Stats for History */}
        {activeTab === 'closed' && historyStats.total > 0 && (
          <div className="mx-4 mb-3 p-3 bg-[#1a1a2e] rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-emerald-400 font-bold text-lg">{historyStats.wins}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Wins</p>
                </div>
                <div className="w-px h-8 bg-[#2d2d44]" />
                <div className="text-center">
                  <p className="text-red-400 font-bold text-lg">{historyStats.losses}</p>
                  <p className="text-[10px] text-gray-500 uppercase">Losses</p>
                </div>
                <div className="w-px h-8 bg-[#2d2d44]" />
                <div className="text-center">
                  <p className="text-blue-400 font-bold text-lg">{historyStats.winRate.toFixed(0)}%</p>
                  <p className="text-[10px] text-gray-500 uppercase">Win Rate</p>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'font-bold text-lg',
                  historyStats.totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {historyStats.totalPL >= 0 ? '+' : ''}{historyStats.totalPL.toFixed(2)}
                </p>
                <p className="text-[10px] text-gray-500 uppercase">Total P/L</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-4 mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {activeTab === 'opened' ? (
            <OpenTradesList trades={searchedActiveTrades} latestPrices={latestPrices} searchQuery={searchQuery} />
          ) : (
            <HistoryTradesList trades={searchedClosedTrades} searchQuery={searchQuery} />
          )}
        </div>
      </div>
    </>
  );
}

function OpenTradesList({ trades, latestPrices, searchQuery }: { trades: Trade[]; latestPrices: Map<string, any>; searchQuery: string }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="w-14 h-14 rounded-full bg-[#1a1a2e] flex items-center justify-center mb-3">
          <Clock className="h-7 w-7 opacity-40" />
        </div>
        <p className="text-sm font-medium text-gray-400">{searchQuery ? 'No matches' : 'No open trades'}</p>
        <p className="text-xs text-gray-500 mt-1">{searchQuery ? 'Try a different symbol' : 'Place a trade to see it here'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <OpenTradeCard key={trade.id} trade={trade} currentPrice={latestPrices.get(trade.symbol)?.price} />
      ))}
    </div>
  );
}

function OpenTradeCard({ trade, currentPrice }: { trade: Trade; currentPrice?: number }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const expiresAt = new Date(trade.expiresAt).getTime();
    const createdAt = new Date(trade.createdAt).getTime();
    const totalDuration = expiresAt - createdAt;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      const elapsed = totalDuration - remaining;
      setTimeLeft(Math.ceil(remaining / 1000));
      setProgress((elapsed / totalDuration) * 100);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);
    return () => clearInterval(interval);
  }, [trade.expiresAt, trade.createdAt]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isUp = trade.direction === 'UP';

  // Calculate real-time P/L
  const pl = useMemo(() => {
    if (!currentPrice) return null;
    const isInProfit = isUp
      ? currentPrice > trade.entryPrice
      : currentPrice < trade.entryPrice;
    const plAmount = isInProfit
      ? trade.amount * (trade.payout / 100)
      : -trade.amount;
    return { isInProfit, plAmount };
  }, [currentPrice, isUp, trade.entryPrice, trade.amount, trade.payout]);

  const isWinning = pl ? pl.isInProfit : isUp;

  return (
    <div
      className={cn(
        'bg-[#1a1a2e] rounded-xl overflow-hidden cursor-pointer transition-all',
        'border',
        isWinning ? 'border-emerald-500/30' : 'border-red-500/30'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Progress bar */}
      <div className="h-1 bg-[#252540]">
        <div
          className={cn(
            'h-full transition-all',
            isWinning ? 'bg-emerald-500' : 'bg-red-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-3">
        {/* Main Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              isUp ? 'bg-emerald-500/15' : 'bg-red-500/15'
            )}>
              {isUp ? (
                <ArrowUp className="h-5 w-5 text-emerald-400" strokeWidth={2.5} />
              ) : (
                <ArrowDown className="h-5 w-5 text-red-400" strokeWidth={2.5} />
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{trade.symbol}</p>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                  isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                )}>
                  {isUp ? 'UP' : 'DOWN'}
                </span>
                <span className="text-gray-500 text-[10px]">${trade.amount}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2">
              {pl && (
                <span className={cn(
                  'font-bold text-sm',
                  pl.isInProfit ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {pl.isInProfit ? '+' : ''}{pl.plAmount.toFixed(2)}
                </span>
              )}
              <div className={cn(
                'px-2 py-1 rounded-lg font-mono font-bold text-sm',
                isWinning ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
              )}>
                {formatTime(timeLeft)}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">+{trade.payout}% payout</p>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#2d2d44] grid grid-cols-2 gap-2">
            <div className="bg-[#252540] rounded-lg p-2">
              <p className="text-[10px] text-gray-500 mb-0.5">Entry Price</p>
              <p className="text-white font-mono text-xs">{formatPrice(trade.entryPrice, trade.symbol)}</p>
            </div>
            <div className="bg-[#252540] rounded-lg p-2">
              <p className="text-[10px] text-gray-500 mb-0.5">Current Price</p>
              <p className="text-blue-400 font-mono text-xs">{currentPrice ? formatPrice(currentPrice, trade.symbol) : '-'}</p>
            </div>
          </div>
        )}

        {/* Expand indicator */}
        <div className="flex justify-center mt-2">
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-600 transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </div>
    </div>
  );
}

function HistoryTradesList({ trades, searchQuery }: { trades: Trade[]; searchQuery: string }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="w-14 h-14 rounded-full bg-[#1a1a2e] flex items-center justify-center mb-3">
          <History className="h-7 w-7 opacity-40" />
        </div>
        <p className="text-sm font-medium text-gray-400">{searchQuery ? 'No matches' : 'No trade history'}</p>
        <p className="text-xs text-gray-500 mt-1">{searchQuery ? 'Try a different symbol' : 'Completed trades appear here'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {trades.map((trade) => (
        <HistoryTradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}

function HistoryTradeCard({ trade }: { trade: Trade }) {
  const [expanded, setExpanded] = useState(false);

  const isWon = trade.status === 'won';
  const isUp = trade.direction === 'UP';
  const profit = trade.profit || 0;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div
      className={cn(
        'bg-[#1a1a2e] rounded-xl overflow-hidden cursor-pointer transition-all',
        'border',
        isWon ? 'border-emerald-500/20' : 'border-red-500/20'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-3">
        {/* Main Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              isUp ? 'bg-emerald-500/15' : 'bg-red-500/15'
            )}>
              {isUp ? (
                <TrendingUp className={cn('h-5 w-5', isWon ? 'text-emerald-400' : 'text-emerald-400/50')} strokeWidth={2} />
              ) : (
                <TrendingDown className={cn('h-5 w-5', isWon ? 'text-red-400' : 'text-red-400/50')} strokeWidth={2} />
              )}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{trade.symbol}</p>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                  isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                )}>
                  {isUp ? 'UP' : 'DOWN'}
                </span>
                <span className="text-gray-500 text-[10px]">{formatTime(trade.closedAt || trade.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className={cn(
              'font-bold text-base',
              isWon ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isWon ? '+' : '-'}${Math.abs(isWon ? profit : trade.amount).toFixed(2)}
            </p>
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
              isWon ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            )}>
              {isWon ? 'WIN' : 'LOSS'}
            </span>
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#2d2d44] grid grid-cols-3 gap-2">
            <div className="bg-[#252540] rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500 mb-0.5">Amount</p>
              <p className="text-white font-semibold text-xs">${trade.amount}</p>
            </div>
            <div className="bg-[#252540] rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500 mb-0.5">Entry</p>
              <p className="text-white font-mono text-[10px]">{formatPrice(trade.entryPrice, trade.symbol)}</p>
            </div>
            <div className="bg-[#252540] rounded-lg p-2 text-center">
              <p className="text-[10px] text-gray-500 mb-0.5">Exit</p>
              <p className="text-white font-mono text-[10px]">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.symbol) : '-'}</p>
            </div>
          </div>
        )}

        {/* Expand indicator */}
        <div className="flex justify-center mt-2">
          <ChevronDown className={cn(
            'h-4 w-4 text-gray-600 transition-transform',
            expanded && 'rotate-180'
          )} />
        </div>
      </div>
    </div>
  );
}
