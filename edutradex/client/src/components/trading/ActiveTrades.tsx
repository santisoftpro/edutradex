'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';

export function ActiveTrades() {
  const { activeTrades } = useTradeStore();

  if (activeTrades.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-2 md:bottom-3 left-2 md:left-3 right-2 md:right-auto z-10 flex flex-wrap gap-1.5 md:gap-2 max-w-full md:max-w-[calc(100%-24px)] mb-[80px] md:mb-0">
      {activeTrades.slice(0, 4).map((trade) => (
        <ActiveTradePill key={trade.id} trade={trade} />
      ))}
      {activeTrades.length > 4 && (
        <div className="flex items-center px-2 md:px-3 py-1 md:py-1.5 bg-slate-800/90 rounded-full text-[10px] md:text-xs text-slate-400">
          +{activeTrades.length - 4} more
        </div>
      )}
    </div>
  );
}

function ActiveTradePill({ trade }: { trade: Trade }) {
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

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full overflow-hidden',
        'bg-slate-800/90 backdrop-blur-sm border',
        isUp ? 'border-emerald-500/50' : 'border-red-500/50'
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
              'transition-all duration-100',
              isUp ? 'text-emerald-500' : 'text-red-500'
            )}
          />
        </svg>
        {/* Direction icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isUp ? (
            <ArrowUp className="h-3 w-3 text-emerald-400" strokeWidth={3} />
          ) : (
            <ArrowDown className="h-3 w-3 text-red-400" strokeWidth={3} />
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
          <span className={cn(
            'text-[10px] font-medium',
            isUp ? 'text-emerald-400' : 'text-red-400'
          )}>
            +{trade.payout}%
          </span>
        </div>
      </div>
    </div>
  );
}
