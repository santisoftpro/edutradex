'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';

interface TradeMarkersProps {
  symbol: string;
  currentPrice?: number;
}

export function TradeMarkers({ symbol, currentPrice }: TradeMarkersProps) {
  const { activeTrades } = useTradeStore();

  // Filter trades for current symbol
  const symbolTrades = activeTrades.filter(t => t.symbol === symbol);

  if (symbolTrades.length === 0) return null;

  return (
    <div className="hidden md:flex absolute right-4 top-16 z-20 flex-col gap-1.5 max-w-[180px]">
      {symbolTrades.slice(0, 5).map((trade) => (
        <CompactTradeMarker key={trade.id} trade={trade} currentPrice={currentPrice} />
      ))}
      {symbolTrades.length > 5 && (
        <div className="text-xs text-slate-400 text-center py-1">
          +{symbolTrades.length - 5} more trades
        </div>
      )}
    </div>
  );
}

function CompactTradeMarker({ trade, currentPrice }: { trade: Trade; currentPrice?: number }) {
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
  const priceDiff = currentPrice ? currentPrice - trade.entryPrice : 0;
  const isWinning = isUp ? priceDiff > 0 : priceDiff < 0;

  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden backdrop-blur-sm',
        'bg-[#1a1a2e]/90 border',
        isUp ? 'border-emerald-500/40' : 'border-red-500/40'
      )}
    >
      {/* Progress bar at top */}
      <div className="h-0.5 bg-slate-700">
        <div
          className={cn(
            'h-full transition-all duration-100',
            isUp ? 'bg-emerald-500' : 'bg-red-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-2.5 py-1.5">
        {/* Main row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-5 h-5 rounded flex items-center justify-center',
              isUp ? 'bg-emerald-500/20' : 'bg-red-500/20'
            )}>
              {isUp ? (
                <ArrowUp className="h-3 w-3 text-emerald-400" strokeWidth={3} />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-400" strokeWidth={3} />
              )}
            </div>
            <span className="text-white font-semibold text-sm">${trade.amount}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded',
              isWinning
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}>
              {isWinning ? 'WIN' : 'LOSE'}
            </span>
            <span className="text-white font-mono text-xs font-bold min-w-[32px] text-right">
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Price info */}
        <div className="flex items-center justify-between mt-1 text-[10px]">
          <span className="text-slate-500">
            Entry: <span className="text-slate-400 font-mono">{trade.entryPrice.toFixed(5)}</span>
          </span>
          <span className="text-emerald-400 font-medium">+{trade.payout}%</span>
        </div>
      </div>
    </div>
  );
}
