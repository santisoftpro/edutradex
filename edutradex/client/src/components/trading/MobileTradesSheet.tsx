'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Clock,
  History,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';

interface MobileTradesSheetProps {
  isOpen: boolean;
  onClose: () => void;
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

export function MobileTradesSheet({ isOpen, onClose }: MobileTradesSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('opened');
  const { activeTrades, trades } = useTradeStore();

  const closedTrades = trades
    .filter(t => t.status === 'won' || t.status === 'lost')
    .slice(0, 20);

  if (!isOpen) return null;

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
        <div className="flex justify-center py-2">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[#2d2d44]">
          <h2 className="text-white font-semibold text-lg">My Trades</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#252542] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-3 gap-2">
          <button
            onClick={() => setActiveTab('opened')}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'opened'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'bg-[#252542] text-gray-400'
            )}
          >
            <Clock className="h-4 w-4" />
            Open
            {activeTrades.length > 0 && (
              <span className={cn(
                'px-2 py-0.5 text-xs rounded-full font-bold',
                activeTab === 'opened' ? 'bg-white/20' : 'bg-blue-600 text-white'
              )}>
                {activeTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={cn(
              'flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2',
              activeTab === 'closed'
                ? 'bg-slate-600 text-white shadow-lg shadow-slate-600/20'
                : 'bg-[#252542] text-gray-400'
            )}
          >
            <History className="h-4 w-4" />
            History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-safe">
          {activeTab === 'opened' ? (
            <MobileOpenedTrades trades={activeTrades} />
          ) : (
            <MobileClosedTrades trades={closedTrades} />
          )}
        </div>
      </div>
    </>
  );
}

function MobileOpenedTrades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="w-20 h-20 rounded-full bg-[#252542] flex items-center justify-center mb-4">
          <Clock className="h-10 w-10 opacity-50" />
        </div>
        <p className="text-base font-medium text-gray-400">No open trades</p>
        <p className="text-sm text-gray-500 mt-1">Place a trade to see it here</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-2">
      {trades.map((trade) => (
        <MobileOpenedTradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}

function MobileOpenedTradeCard({ trade }: { trade: Trade }) {
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

  return (
    <div
      className={cn(
        'bg-[#252542] rounded-xl relative overflow-hidden',
        'border-l-4',
        isUp ? 'border-l-emerald-500' : 'border-l-red-500'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Progress bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-1 transition-all',
          isUp ? 'bg-emerald-500/50' : 'bg-red-500/50'
        )}
        style={{ width: `${progress}%` }}
      />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isUp ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isUp ? (
                <ArrowUp className="h-5 w-5 text-emerald-400" />
              ) : (
                <ArrowDown className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <span className="text-white font-semibold block">{trade.symbol}</span>
              <span className={cn(
                'text-xs font-medium',
                isUp ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isUp ? 'BUY' : 'SELL'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-lg font-mono">{formatTime(timeLeft)}</div>
            <div className="text-emerald-400 text-sm font-medium">+{trade.payout}%</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Investment</span>
          <span className="text-white font-semibold">${trade.amount.toFixed(2)}</span>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#3d3d5c] space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Entry Price</span>
              <span className="text-white font-mono">{formatPrice(trade.entryPrice, trade.symbol)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Potential Profit</span>
              <span className="text-emerald-400 font-semibold">+${potentialProfit.toFixed(2)}</span>
            </div>
          </div>
        )}

        <ChevronDown className={cn(
          'h-4 w-4 text-gray-500 mx-auto mt-2 transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </div>
    </div>
  );
}

function MobileClosedTrades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="w-20 h-20 rounded-full bg-[#252542] flex items-center justify-center mb-4">
          <History className="h-10 w-10 opacity-50" />
        </div>
        <p className="text-base font-medium text-gray-400">No trade history</p>
        <p className="text-sm text-gray-500 mt-1">Completed trades appear here</p>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 space-y-2">
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
        'bg-[#252542] rounded-xl overflow-hidden',
        'border-l-4',
        isWon ? 'border-l-emerald-500' : 'border-l-red-500'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isWon ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isWon ? (
                <CheckCircle className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div>
              <span className="text-white font-semibold block">{trade.symbol}</span>
              <span className="text-gray-500 text-xs">{formatTime(trade.closedAt || trade.createdAt)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className={cn(
              'font-bold text-xl',
              isWon ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isWon ? '+' : '-'}${Math.abs(isWon ? profit : trade.amount).toFixed(2)}
            </span>
            <div className={cn(
              'text-xs font-medium',
              isWon ? 'text-emerald-400' : 'text-red-400'
            )}>
              {isWon ? 'PROFIT' : 'LOSS'}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#3d3d5c] grid grid-cols-2 gap-3 text-sm">
            <div className="bg-[#1a1a2e] rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Direction</span>
              <span className={cn('font-semibold', isUp ? 'text-emerald-400' : 'text-red-400')}>
                {isUp ? 'BUY' : 'SELL'}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Payout</span>
              <span className="text-blue-400 font-semibold">+{trade.payout}%</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Entry</span>
              <span className="text-white font-mono text-xs">{formatPrice(trade.entryPrice, trade.symbol)}</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-3">
              <span className="text-gray-500 text-xs block mb-1">Exit</span>
              <span className="text-white font-mono text-xs">{trade.exitPrice ? formatPrice(trade.exitPrice, trade.symbol) : '-'}</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-3 col-span-2">
              <span className="text-gray-500 text-xs block mb-1">Pips</span>
              <span className={cn('font-mono font-semibold', pipsInFavor >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {pipsInFavor >= 0 ? '+' : ''}{pips.toFixed(1)} pips
              </span>
            </div>
          </div>
        )}

        <ChevronDown className={cn(
          'h-4 w-4 text-gray-500 mx-auto mt-2 transition-transform',
          isExpanded && 'rotate-180'
        )} />
      </div>
    </div>
  );
}
