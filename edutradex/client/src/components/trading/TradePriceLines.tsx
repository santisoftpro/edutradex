'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';

interface TradePriceLinesProps {
  symbol: string;
  currentPrice?: number;
}

export function TradePriceLines({ symbol, currentPrice }: TradePriceLinesProps) {
  const { activeTrades } = useTradeStore();

  // Filter trades for current symbol
  const symbolTrades = activeTrades.filter(t => t.symbol === symbol);

  if (symbolTrades.length === 0 || !currentPrice) return null;

  return (
    <div className="absolute left-0 right-0 top-12 bottom-0 pointer-events-none z-10 overflow-hidden">
      {symbolTrades.map((trade) => (
        <EntryPriceMarker key={trade.id} trade={trade} />
      ))}
    </div>
  );
}

function EntryPriceMarker({ trade }: { trade: Trade }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const expiresAt = new Date(trade.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(Math.ceil(remaining / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [trade.expiresAt]);

  const isUp = trade.direction === 'UP';
  const lineColor = isUp ? 'bg-emerald-500' : 'bg-red-500';
  const textColor = isUp ? 'text-emerald-400' : 'text-red-400';

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Position based on trade creation order - just stack them
  const index = 0; // Each marker will be at a fixed position on left

  return (
    <div className="absolute left-0 flex items-center" style={{ top: `${80 + index * 28}px` }}>
      {/* Small entry marker label */}
      <div className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-r text-[10px] font-medium',
        isUp ? 'bg-emerald-500/90' : 'bg-red-500/90',
        'text-white shadow-lg'
      )}>
        {isUp ? (
          <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
        ) : (
          <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />
        )}
        <span>${trade.amount}</span>
        <span className="opacity-80">@</span>
        <span className="font-mono">{trade.entryPrice.toFixed(5)}</span>
        <span className="ml-1 opacity-80">{formatTime(timeLeft)}</span>
      </div>
    </div>
  );
}
