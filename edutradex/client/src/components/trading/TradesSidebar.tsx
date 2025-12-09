'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Clock, CheckCircle, XCircle, ListOrdered, History, ChevronRight, ChevronDown } from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { PriceTick } from '@/lib/api';
import { cn } from '@/lib/utils';

type TabType = 'opened' | 'closed';

interface TradesSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  latestPrices: Map<string, PriceTick>;
}

// Calculate pips difference between two prices
function calculatePips(symbol: string, entryPrice: number, exitPrice: number): number {
  // JPY pairs have 2 decimal places, others have 4-5
  const isJPYPair = symbol.includes('JPY');
  const pipMultiplier = isJPYPair ? 100 : 10000;

  const pips = (exitPrice - entryPrice) * pipMultiplier;
  return Math.round(pips * 10) / 10; // Round to 1 decimal
}

// Format price with appropriate decimal places
function formatPrice(price: number, symbol: string): string {
  const isJPYPair = symbol.includes('JPY');
  return price.toFixed(isJPYPair ? 3 : 5);
}

export function TradesSidebar({ onToggle, latestPrices }: TradesSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabType>('opened');
  const [isClient, setIsClient] = useState(false);
  const { activeTrades, trades } = useTradeStore();

  // Prevent hydration mismatch - only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get recent closed trades (last 10) - trades with status 'won' or 'lost'
  const closedTrades = trades
    .filter(t => t.status === 'won' || t.status === 'lost')
    .slice(0, 10);

  if (!isClient) {
    return null;
  }

  return (
    <div className="hidden lg:flex w-56 bg-[#1a1a2e] border-l border-[#2d2d44] flex-col h-full relative animate-in slide-in-from-right duration-200 mr-[68px]">
      {/* Header with close button */}
      <div className="p-3 border-b border-[#2d2d44] flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Trades</h3>
        <button
          onClick={onToggle}
          className="p-1.5 hover:bg-[#252542] rounded-lg transition-colors group"
          title="Hide Trades Panel"
        >
          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white" />
        </button>
      </div>

      {/* Tabs - Improved design */}
      <div className="flex p-2 gap-1">
        <button
          onClick={() => setActiveTab('opened')}
          className={cn(
            'flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
            activeTab === 'opened'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'bg-[#252542] text-gray-400 hover:text-white hover:bg-[#2d2d52]'
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
              : 'bg-[#252542] text-gray-400 hover:text-white hover:bg-[#2d2d52]'
          )}
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'opened' ? (
          <OpenedTrades trades={activeTrades} latestPrices={latestPrices} />
        ) : (
          <ClosedTrades trades={closedTrades} />
        )}
      </div>
    </div>
  );
}

function OpenedTrades({ trades, latestPrices }: { trades: Trade[]; latestPrices: Map<string, any> }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <div className="w-16 h-16 rounded-full bg-[#252542] flex items-center justify-center mb-3">
          <ListOrdered className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium text-gray-400">No open trades</p>
        <p className="text-xs text-gray-500 mt-1 text-center">Place a trade to see it here</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {trades.map((trade) => (
        <OpenedTradeCard key={trade.id} trade={trade} currentPrice={latestPrices.get(trade.symbol)?.price} />
      ))}
    </div>
  );
}

function OpenedTradeCard({ trade, currentPrice }: { trade: Trade; currentPrice?: number }) {
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

  return (
    <div
      className={cn(
        'bg-[#252542] rounded-lg relative overflow-hidden cursor-pointer transition-all duration-300',
        'border-l-3',
        borderColor
      )}
      style={{ borderLeftWidth: '3px' }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Progress bar at bottom */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-1 transition-all duration-300',
          progressColor
        )}
        style={{ width: `${progress}%` }}
      />

      {/* Main content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300',
              iconBgColor
            )}>
              {isUp ? (
                <ArrowUp className={cn('h-3.5 w-3.5 transition-colors duration-300', iconColor)} />
              ) : (
                <ArrowDown className={cn('h-3.5 w-3.5 transition-colors duration-300', iconColor)} />
              )}
            </div>
            <span className="text-white text-sm font-semibold">{trade.symbol}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn(
              'px-2 py-1 rounded-full text-[10px] font-bold transition-colors duration-300',
              iconBgColor,
              iconColor
            )}>
              {isUp ? 'BUY' : 'SELL'}
            </div>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="h-3 w-3" />
            <span className="font-mono font-semibold text-white">{formatTime(timeLeft)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">${trade.amount.toFixed(0)}</span>
            {pl ? (
              <span className={cn(
                'font-bold text-sm',
                pl.isInProfit ? 'text-emerald-400' : 'text-red-400'
              )}>
                {pl.isInProfit ? '+' : '-'}${Math.abs(pl.plAmount).toFixed(2)}
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">+{trade.payout}%</span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#3d3d5c] space-y-2 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Forecast</span>
              <span className={cn(
                'font-bold',
                isUp ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isUp ? 'UP (Buy)' : 'DOWN (Sell)'}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Payout</span>
              <span className="text-blue-400 font-bold">+{trade.payout}%</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Investment</span>
              <span className="text-white font-bold">${trade.amount.toFixed(2)}</span>
            </div>
            <div className={cn(
              'rounded-md p-2',
              pl ? (pl.isInProfit ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30') : 'bg-[#1a1a2e]'
            )}>
              <span className="text-gray-500 block">Real-time P/L</span>
              {pl ? (
                <span className={cn(
                  'font-bold',
                  pl.isInProfit ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {pl.isInProfit ? '+' : '-'}${Math.abs(pl.plAmount).toFixed(2)}
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">+${potentialProfit.toFixed(2)}</span>
              )}
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2 col-span-2">
              <span className="text-gray-500 block">Entry Price</span>
              <span className="text-white font-bold font-mono">{formatPrice(trade.entryPrice, trade.symbol)}</span>
            </div>
            {currentPrice && (
              <div className="bg-[#1a1a2e] rounded-md p-2 col-span-2">
                <span className="text-gray-500 block">Current Price</span>
                <span className="text-blue-400 font-bold font-mono">{formatPrice(currentPrice, trade.symbol)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClosedTrades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <div className="w-16 h-16 rounded-full bg-[#252542] flex items-center justify-center mb-3">
          <History className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm font-medium text-gray-400">No trade history</p>
        <p className="text-xs text-gray-500 mt-1 text-center">Completed trades appear here</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {trades.map((trade) => (
        <ClosedTradeCard key={trade.id} trade={trade} />
      ))}
    </div>
  );
}

function ClosedTradeCard({ trade }: { trade: Trade }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isWon = trade.status === 'won';
  const isUp = trade.direction === 'UP';
  const profit = trade.profit || 0;

  // Calculate pips if we have exit price
  const pips = trade.exitPrice
    ? calculatePips(trade.symbol, trade.entryPrice, trade.exitPrice)
    : 0;

  // Determine if pips are in favor of the trade direction
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
        'bg-[#252542] rounded-lg cursor-pointer transition-all',
        'border-l-3',
        isWon ? 'border-l-emerald-500' : 'border-l-red-500'
      )}
      style={{ borderLeftWidth: '3px' }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Main content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              isUp ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isUp ? (
                <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>
            <span className="text-white text-sm font-semibold">{trade.symbol}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center',
              isWon ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isWon ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{formatTime(trade.closedAt || trade.createdAt)}</span>
          <span className={cn(
            'font-bold text-sm',
            isWon ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isWon ? '+' : '-'}${Math.abs(isWon ? profit : trade.amount).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#3d3d5c] space-y-2 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Forecast</span>
              <span className={cn(
                'font-bold',
                isUp ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isUp ? 'UP (Buy)' : 'DOWN (Sell)'}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Result</span>
              <span className={cn(
                'font-bold',
                isWon ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isWon ? 'PROFIT' : 'LOSS'}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Payout</span>
              <span className="text-blue-400 font-bold">+{trade.payout}%</span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">{isWon ? 'Profit' : 'Loss'}</span>
              <span className={cn(
                'font-bold',
                isWon ? 'text-emerald-400' : 'text-red-400'
              )}>
                {isWon ? '+' : '-'}${Math.abs(isWon ? profit : trade.amount).toFixed(2)}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Entry Price</span>
              <span className="text-white font-bold font-mono text-[9px]">
                {formatPrice(trade.entryPrice, trade.symbol)}
              </span>
            </div>
            <div className="bg-[#1a1a2e] rounded-md p-2">
              <span className="text-gray-500 block">Exit Price</span>
              <span className="text-white font-bold font-mono text-[9px]">
                {trade.exitPrice ? formatPrice(trade.exitPrice, trade.symbol) : '-'}
              </span>
            </div>
           
          </div>
        </div>
      )}
    </div>
  );
}
