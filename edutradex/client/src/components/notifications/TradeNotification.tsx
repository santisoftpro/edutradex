'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface TradeNotificationProps {
  symbol: string;
  result: 'WON' | 'LOST';
  amount: number;
  profit: number;
  direction: string;
  entryPrice?: number;
  exitPrice?: number;
}

/**
 * Show a compact trade result notification toast
 * Designed to be small, non-intrusive, and auto-dismiss quickly
 */
export function showTradeNotification({
  symbol,
  result,
  profit,
  amount,
}: TradeNotificationProps): void {
  const isWin = result === 'WON';
  const displayAmount = isWin ? profit : amount;

  // Dismiss any existing trade notifications to prevent stacking
  toast.dismiss();

  toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-in slide-in-from-right fade-in duration-100' : 'animate-out slide-out-to-right fade-out duration-75'
        } pointer-events-auto max-w-[200px]`}
        onClick={() => toast.dismiss(t.id)}
      >
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md shadow-lg text-xs ${
            isWin
              ? 'bg-emerald-600/95'
              : 'bg-red-600/95'
          }`}
        >
          {isWin ? (
            <TrendingUp className="h-3.5 w-3.5 text-white flex-shrink-0" strokeWidth={2.5} />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-white flex-shrink-0" strokeWidth={2.5} />
          )}
          <span className="text-white/90 font-medium truncate">
            {symbol}
          </span>
          <span className="text-white font-bold whitespace-nowrap">
            {isWin ? '+' : '-'}${displayAmount.toFixed(2)}
          </span>
        </div>
      </div>
    ),
    {
      duration: 2000,
      position: 'top-right',
      id: 'trade-result', // Use same ID to replace previous notification
    }
  );
}
