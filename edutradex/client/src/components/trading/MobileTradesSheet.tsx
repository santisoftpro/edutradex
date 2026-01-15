'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  History,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  ChevronDown,
  Search,
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

function calculatePips(symbol: string, entryPrice: number, exitPrice: number): number {
  const isJPYPair = symbol.includes('JPY');
  const pipMultiplier = isJPYPair ? 100 : 10000;
  const pips = (exitPrice - entryPrice) * pipMultiplier;
  return Math.round(pips * 10) / 10;
}

function formatPrice(price: number, symbol: string): string {
  const isJPYPair = symbol.includes('JPY');
  return price.toFixed(isJPYPair ? 3 : 5);
}

export function MobileTradesSheet({ isOpen, onClose, latestPrices }: MobileTradesSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('opened');
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use filtered trades - only shows trades for current account type (LIVE or DEMO)
  const activeTrades = useFilteredActiveTrades();
  const allTrades = useFilteredTrades();

  // Prevent hydration mismatch - only render on client side
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

  const searchedActiveTrades = useMemo(() => {
    if (!searchQuery.trim()) return activeTrades;
    const query = searchQuery.toLowerCase().trim();
    return activeTrades.filter((trade) =>
      trade.symbol.toLowerCase().includes(query)
    );
  }, [activeTrades, searchQuery]);

  const searchedClosedTrades = useMemo(() => {
    if (!searchQuery.trim()) return closedTrades;
    const query = searchQuery.toLowerCase().trim();
    return closedTrades.filter((trade) =>
      trade.symbol.toLowerCase().includes(query)
    );
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
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#1a1a2e] rounded-t-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center py-1.5">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pb-2 border-b border-[#2d2d44]">
          <h2 className="text-white font-semibold text-sm">My Trades</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#252542] rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <div className="px-2.5 pt-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol..."
              className="w-full pl-9 pr-3 py-2 bg-[#252542] border border-[#3d3d5c] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-2.5 gap-1.5">
          <button
            onClick={() => setActiveTab('opened')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
              activeTab === 'opened'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-[#252542] text-gray-400'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            Open
            {activeTrades.length > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] rounded-full font-bold',
                activeTab === 'opened' ? 'bg-white/20' : 'bg-blue-600 text-white'
              )}>
                {activeTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={cn(
              'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
              activeTab === 'closed'
                ? 'bg-slate-600 text-white shadow-lg shadow-slate-600/20'
                : 'bg-[#252542] text-gray-400'
            )}
          >
            <History className="h-3.5 w-3.5" />
            History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-safe">
          {activeTab === 'opened' ? (
            <MobileOpenedTrades trades={searchedActiveTrades} latestPrices={latestPrices} searchQuery={searchQuery} />
          ) : (
            <MobileClosedTrades trades={searchedClosedTrades} searchQuery={searchQuery} />
          )}
        </div>
      </div>
    </>
  );
}

function MobileOpenedTrades({ trades, latestPrices, searchQuery }: { trades: Trade[]; latestPrices: Map<string, any>; searchQuery: string }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="w-16 h-16 rounded-full bg-[#252542] flex items-center justify-center mb-3">
          <Clock className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium text-gray-400">{searchQuery ? 'No matches' : 'No open trades'}</p>
        <p className="text-xs text-gray-500 mt-1">{searchQuery ? 'Try a different symbol' : 'Place a trade to see it here'}</p>
      </div>
    );
  }

  return (
    <div className="px-2.5 pb-3 space-y-1.5">
      {trades.map((trade) => (
        <MobileOpenedTradeCard key={trade.id} trade={trade} currentPrice={latestPrices.get(trade.symbol)?.price} />
      ))}
    </div>
  );
}

function MobileOpenedTradeCard({ trade, currentPrice }: { trade: Trade; currentPrice?: number }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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
  const potentialProfit = trade.amount * (trade.payout / 100);

  // Calculate real-time P/L
  const calculatePL = () => {
    if (!currentPrice) return null;

    const isInProfit = isUp
      ? currentPrice > trade.entryPrice  // UP trade wins if price goes up
      : currentPrice < trade.entryPrice; // DOWN trade wins if price goes down

    const plAmount = isInProfit
      ? trade.amount * (trade.payout / 100) // Potential profit
      : -trade.amount;                       // Full loss

    return { isInProfit, plAmount };
  };

  const pl = calculatePL();

  // Determine colors based on P/L status (if available) or fallback to direction
  const isWinning = pl ? pl.isInProfit : isUp;
  const borderColor = isWinning ? 'border-l-emerald-500' : 'border-l-red-500';
  const progressColor = isWinning ? 'bg-emerald-500/50' : 'bg-red-500/50';
  const iconBgColor = isWinning ? 'bg-emerald-500/20' : 'bg-red-500/20';
  const iconColor = isWinning ? 'text-emerald-400' : 'text-red-400';
  const labelColor = isWinning ? 'text-emerald-400' : 'text-red-400';

  return (
    <div
      className={cn(
        'bg-[#252542] rounded-lg relative overflow-hidden transition-colors duration-300',
        'border-l-2',
        borderColor
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Progress bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-0.5 transition-all duration-300',
          progressColor
        )}
        style={{ width: `${progress}%` }}
      />

      <div className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-300',
              iconBgColor
            )}>
              {isUp ? (
                <ArrowUp className={cn('h-3.5 w-3.5 transition-colors duration-300', iconColor)} />
              ) : (
                <ArrowDown className={cn('h-3.5 w-3.5 transition-colors duration-300', iconColor)} />
              )}
            </div>
            <div>
              <span className="text-white font-semibold text-sm block leading-tight">{trade.symbol}</span>
              <span className={cn(
                'text-[10px] font-medium transition-colors duration-300',
                labelColor
              )}>
                {isUp ? 'BUY' : 'SELL'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-sm font-mono leading-tight">{formatTime(timeLeft)}</div>
            <div className="text-emerald-400 text-[10px] font-medium">+{trade.payout}%</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Investment</span>
          <span className="text-white font-semibold">${trade.amount.toFixed(2)}</span>
        </div>

        {/* Real-time P/L display - always visible */}
        {pl && (
          <div className={cn(
            'flex items-center justify-between text-xs mt-1.5 py-1.5 px-2 rounded-md',
            pl.isInProfit ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'
          )}>
            <span className={cn(
              'font-medium text-[11px]',
              pl.isInProfit ? 'text-emerald-400' : 'text-red-400'
            )}>
              Real-time P/L
            </span>
            <span className={cn(
              'font-bold text-sm',
              pl.isInProfit ? 'text-emerald-400' : 'text-red-400'
            )}>
              {pl.isInProfit ? '+' : '-'}${Math.abs(pl.plAmount).toFixed(2)}
            </span>
          </div>
        )}

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-[#3d3d5c] space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Entry Price</span>
              <span className="text-white font-mono">{formatPrice(trade.entryPrice, trade.symbol)}</span>
            </div>
            {currentPrice && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Current Price</span>
                <span className="text-blue-400 font-mono">{formatPrice(currentPrice, trade.symbol)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Potential Profit</span>
              <span className="text-emerald-400 font-semibold">+${potentialProfit.toFixed(2)}</span>
            </div>
          </div>
        )}

        <ChevronDown className={cn(
          'h-3 w-3 text-gray-500 mx-auto mt-1 transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </div>
    </div>
  );
}

function MobileClosedTrades({ trades, searchQuery }: { trades: Trade[]; searchQuery: string }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="w-16 h-16 rounded-full bg-[#252542] flex items-center justify-center mb-3">
          <History className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium text-gray-400">{searchQuery ? 'No matches' : 'No trade history'}</p>
        <p className="text-xs text-gray-500 mt-1">{searchQuery ? 'Try a different symbol' : 'Completed trades appear here'}</p>
      </div>
    );
  }

  return (
    <div className="px-2.5 pb-3 space-y-1.5">
      {trades.map((trade) => (
        <MobileClosedTradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}

function MobileClosedTradeCard({ trade }: { trade: Trade }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isWon = trade.status === 'won';
  const isUp = trade.direction === 'UP';
  const profit = trade.profit || 0;
  const pips = trade.exitPrice
    ? calculatePips(trade.symbol, trade.entryPrice, trade.exitPrice)
    : 0;
  const pipsInFavor = isUp ? pips : -pips;

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
        'bg-[#252542] rounded-lg overflow-hidden',
        'border-l-2',
        isWon ? 'border-l-emerald-500' : 'border-l-red-500'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center',
              isWon ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isWon ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>
            <div>
              <span className="text-white font-semibold text-sm block leading-tight">{trade.symbol}</span>
              <span className="text-gray-500 text-[10px]">{formatTime(trade.closedAt || trade.createdAt)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className={cn(
              'font-bold text-sm leading-tight block',
              isWon ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isWon ? '+' : '-'}${Math.abs(isWon ? profit : trade.amount).toFixed(2)}
            </span>
            <div className={cn(
              'text-[10px] font-medium',
              isWon ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isWon ? 'PROFIT' : 'LOSS'}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-[#3d3d5c] grid grid-cols-2 gap-1.5 text-xs">
            <div className="bg-[#1a1a2e] rounded-lg p-1.5">
              <span className="text-gray-500 text-[10px] block mb-0.5">Direction</span>
              <span className={cn('font-semibold text-xs', isUp ? 'text-emerald-400' : 'text-red-400')}>
                {isUp ? 'BUY' : 'SELL'}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5">
              <span className="text-gray-500 text-[10px] block mb-0.5">Payout</span>
              <span className="text-blue-400 font-semibold text-xs">+{trade.payout}%</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5">
              <span className="text-gray-500 text-[10px] block mb-0.5">Entry</span>
              <span className="text-white font-mono text-[10px]">{formatPrice(trade.entryPrice, trade.symbol)}</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5">
              <span className="text-gray-500 text-[10px] block mb-0.5">Exit</span>
              <span className="text-white font-mono text-[10px]">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.symbol) : '-'}</span>
            </div>
          </div>
        )}

        <ChevronDown className={cn(
          'h-3 w-3 text-gray-500 mx-auto mt-1 transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </div>
    </div>
  );
}
