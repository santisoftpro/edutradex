'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Clock, X, ChevronDown } from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';

export function MobileActiveTrades() {
  const { activeTrades } = useTradeStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (activeTrades.length === 0) {
    return null;
  }

  return (
    <div className="md:hidden absolute top-1 left-1 right-12 z-20">
      {/* Collapsed View - Compact pill */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 px-2 py-1 bg-[#1a1a2e]/90 backdrop-blur-sm border border-[#2d2d44] rounded-lg"
        >
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-white text-[11px] font-medium">{activeTrades.length} trade{activeTrades.length > 1 ? 's' : ''}</span>
          <ChevronDown className="h-3 w-3 text-gray-400" />
        </button>
      )}

      {/* Expanded View - Compact list */}
      {isExpanded && (
        <div className="bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#2d2d44] rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-[#2d2d44]">
            <span className="text-white text-[11px] font-semibold">{activeTrades.length} Active</span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-0.5 hover:bg-[#252542] rounded transition-colors"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>

          {/* Trades List - Very compact */}
          <div className="max-h-28 overflow-y-auto">
            {activeTrades.map((trade) => (
              <MobileTradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileTradeRow({ trade }: { trade: Trade }) {
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

  const isUp = trade.direction === 'UP';

  return (
    <div className="relative px-2 py-1.5 border-b border-[#2d2d44] last:border-b-0">
      {/* Progress Bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 h-0.5 transition-all duration-100',
          isUp ? 'bg-emerald-500' : 'bg-red-500'
        )}
        style={{ width: `${progress}%` }}
      />

      <div className="relative flex items-center justify-between gap-2">
        {/* Left: Direction + Symbol */}
        <div className="flex items-center gap-1.5">
          {isUp ? (
            <ArrowUp className="h-3 w-3 text-emerald-400" strokeWidth={3} />
          ) : (
            <ArrowDown className="h-3 w-3 text-red-400" strokeWidth={3} />
          )}
          <span className="text-white text-[11px] font-medium">{trade.symbol}</span>
          <span className="text-gray-500 text-[10px]">${trade.amount}</span>
        </div>

        {/* Right: Timer */}
        <span className="text-white text-[11px] font-mono font-bold">
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  );
}
