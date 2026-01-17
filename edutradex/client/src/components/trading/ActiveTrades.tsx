'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Trade, useFilteredActiveTrades } from '@/store/trade.store';
import { PriceTick } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ActiveTradesProps {
  latestPrices: Map<string, PriceTick>;
}

export function ActiveTrades({ latestPrices }: ActiveTradesProps) {
  // Use filtered active trades - only shows trades for current account type (LIVE or DEMO)
  const activeTrades = useFilteredActiveTrades();
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch - only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || activeTrades.length === 0) {
    return null;
  }

  return (
    <div className="hidden md:flex absolute bottom-3 left-3 z-10 flex-wrap gap-2 max-w-[calc(100%-24px)]">
      {activeTrades.slice(0, 4).map((trade) => {
        const priceData = latestPrices.get(trade.symbol);
        return (
          <ActiveTradePill key={trade.id} trade={trade} currentPrice={priceData?.price} />
        );
      })}
      {activeTrades.length > 4 && (
        <div className="flex items-center px-3 py-1.5 bg-slate-800/90 rounded-full text-xs text-slate-400">
          +{activeTrades.length - 4} more
        </div>
      )}
    </div>
  );
}

function ActiveTradePill({ trade, currentPrice }: { trade: Trade; currentPrice?: number }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(0);

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

  const formatPrice = (price: number) => {
    if (price > 1000) return price.toFixed(2);
    if (price > 100) return price.toFixed(3);
    return price.toFixed(5);
  };

  const isUp = trade.direction === 'UP';

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
  const borderColor = isWinning ? 'border-emerald-500/50' : 'border-red-500/50';
  const progressColor = isWinning ? 'text-emerald-500' : 'text-red-500';
  const iconColor = isWinning ? 'text-emerald-400' : 'text-red-400';

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full overflow-hidden',
        'bg-slate-800/90 backdrop-blur-sm border transition-colors duration-300',
        borderColor
      )}
    >
      {/* Circular progress indicator */}
      <div className="relative w-7 h-7 flex-shrink-0">
        <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
          {/* Background circle */}
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="text-slate-700"
          />
          {/* Progress circle */}
          <circle
            cx="14"
            cy="14"
            r="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={69.115}
            strokeDashoffset={69.115 - (69.115 * progress) / 100}
            className={cn(
              'transition-all duration-300',
              progressColor
            )}
          />
        </svg>
        {/* Direction icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isUp ? (
            <ArrowUp className={cn('h-3 w-3 transition-colors duration-300', iconColor)} strokeWidth={3} />
          ) : (
            <ArrowDown className={cn('h-3 w-3 transition-colors duration-300', iconColor)} strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Trade info */}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-white text-xs font-semibold truncate">{trade.symbol}</span>
          <span className="text-slate-400 text-[10px]">${trade.amount}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-300 text-[10px] font-mono">@{formatPrice(trade.entryPrice)}</span>
          <span className="text-slate-500 text-[10px]">•</span>
          <span className="text-white text-[10px] font-mono font-bold">{formatTime(timeLeft)}</span>
          {pl ? (
            <>
              <span className="text-slate-500 text-[10px]">•</span>
              <span className={cn(
                'text-[10px] font-bold',
                pl.isInProfit ? 'text-emerald-400' : 'text-red-400'
              )}>
                {pl.isInProfit ? '+' : '-'}${Math.abs(pl.plAmount).toFixed(2)}
              </span>
            </>
          ) : (
            <span className={cn(
              'text-[10px] font-medium ml-1',
              isUp ? 'text-emerald-400' : 'text-red-400'
            )}>
              +{trade.payout}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
