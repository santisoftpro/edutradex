'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, Clock, DollarSign, Loader2, LineChart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTradingPanelProps {
  balance: number;
  onTrade: (direction: 'UP' | 'DOWN', amount: number, duration: number) => void;
  isLoading?: boolean;
  payoutPercent?: number;
  onDurationChange?: (duration: number) => void;
  initialDuration?: number;
  onOpenTrades?: () => void;
  onOpenCopyTrading?: () => void;
  activeTradesCount?: number;
}

const DURATIONS = [
  { label: '5s', value: 5 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
  { label: '10m', value: 600 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000, 5000];

function MobileTradingPanelComponent({
  balance,
  onTrade,
  isLoading,
  payoutPercent = 85,
  onDurationChange,
  initialDuration,
  onOpenTrades,
  onOpenCopyTrading,
  activeTradesCount = 0,
}: MobileTradingPanelProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(50);
  const [duration, setDuration] = useState(300);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [showAmountSheet, setShowAmountSheet] = useState(false);

  // Sync duration from parent after hydration to avoid SSR mismatch
  useEffect(() => {
    if (initialDuration !== undefined && initialDuration !== duration) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  const potentialProfit = amount * (payoutPercent / 100);
  const insufficientBalance = amount > balance;
  const invalidAmount = amount <= 0;

  const handleTrade = useCallback((direction: 'UP' | 'DOWN') => {
    if (!invalidAmount && !insufficientBalance && !isLoading) {
      onTrade(direction, amount, duration);
    }
  }, [invalidAmount, insufficientBalance, isLoading, onTrade, amount, duration]);

  const goToCopy = useCallback(() => {
    if (onOpenCopyTrading) {
      onOpenCopyTrading();
    } else {
      router.push('/dashboard/copy-trading');
    }
  }, [onOpenCopyTrading, router]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    // Compact format: show only relevant units
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    if (mins > 0) {
      return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
    }
    return `${secs}s`;
  };

  const handleDurationSelect = useCallback((value: number) => {
    setDuration(value);
    setShowTimeSheet(false);
    if (onDurationChange) {
      onDurationChange(value);
    }
  }, [onDurationChange]);

  return (
    <>
      {/* Time Selection Bottom Sheet */}
      {showTimeSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setShowTimeSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-2xl z-[60] animate-in slide-in-from-bottom">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-1.5" />
            <div className="p-3 pb-6">
              <h3 className="text-white font-semibold text-sm text-center mb-3">Select Time</h3>
              <div className="grid grid-cols-5 gap-1.5">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => handleDurationSelect(d.value)}
                    className={cn(
                      'py-3 rounded-lg font-semibold text-xs transition-all min-h-[40px]',
                      duration === d.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Amount Selection Bottom Sheet */}
      {showAmountSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setShowAmountSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-2xl z-[60] animate-in slide-in-from-bottom">
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mt-1.5" />
            <div className="p-3 pb-6">
              <h3 className="text-white font-semibold text-sm text-center mb-0.5">Select Amount</h3>
              <p className="text-gray-500 text-[10px] text-center mb-3">Balance: ${balance.toFixed(2)}</p>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => {
                      setAmount(quickAmount);
                      setShowAmountSheet(false);
                    }}
                    className={cn(
                      'py-3 rounded-lg font-semibold text-xs transition-all min-h-[40px]',
                      amount === quickAmount
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
                    )}
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
              {/* Custom Amount */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-8 pr-3 py-3 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-lg font-bold text-center focus:outline-none focus:border-emerald-500"
                  placeholder="Enter amount"
                />
              </div>
              <button
                onClick={() => setShowAmountSheet(false)}
                className="w-full mt-3 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Trading Panel - Fixed at bottom with integrated nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d1a] safe-area-bottom">
        {/* Time, Amount, Profit Row */}
        <div className="flex gap-2 px-3 pt-2 border-t border-[#1a1a2e]">
          {/* Time Input */}
          <button
            onClick={() => setShowTimeSheet(true)}
            className="flex-1 flex items-center justify-between bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-2.5 py-1.5 active:bg-[#252542]"
          >
            <div className="flex flex-col items-start">
              <span className="text-gray-400 text-[10px] font-medium">Time</span>
              <span className="text-white font-bold text-xs">{formatDuration(duration)}</span>
            </div>
            <Clock className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {/* Amount Input */}
          <button
            onClick={() => setShowAmountSheet(true)}
            className="flex-1 flex items-center justify-between bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-2.5 py-1.5 active:bg-[#252542]"
          >
            <div className="flex flex-col items-start">
              <span className="text-gray-400 text-[10px] font-medium">Amount</span>
              <span className="text-white font-bold text-xs">${amount}</span>
            </div>
            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {/* Payout Display */}
          <div className="flex flex-col items-center justify-center bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-gray-400 font-medium">Profit</span>
            <span className="text-emerald-400 font-bold text-xs">+{payoutPercent}%</span>
          </div>
        </div>

        {/* Balance Warning */}
        {insufficientBalance && (
          <div className="mx-3 mt-1.5 py-1.5 px-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span className="text-red-400 text-[11px] font-medium">
              Insufficient balance: ${balance.toFixed(2)}
            </span>
          </div>
        )}

        {/* BUY and SELL Buttons - Compact */}
        <div className="flex gap-2 px-3 py-2">
          <button
            onClick={() => handleTrade('UP')}
            disabled={isLoading || insufficientBalance || invalidAmount}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900/50 disabled:cursor-not-allowed rounded-lg font-bold text-white text-sm flex items-center justify-center gap-1 transition-colors active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                BUY
              </>
            )}
          </button>
          <button
            onClick={() => handleTrade('DOWN')}
            disabled={isLoading || insufficientBalance || invalidAmount}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 disabled:bg-red-900/50 disabled:cursor-not-allowed rounded-lg font-bold text-white text-sm flex items-center justify-center gap-1 transition-colors active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
                SELL
              </>
            )}
          </button>
        </div>

        {/* Inline Navigation - Trade & Copy */}
        <div className="flex items-center justify-center gap-4 px-3 pb-2 pt-1 border-t border-[#1a1a2e]/50">
          <button
            onClick={onOpenTrades}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium active:bg-blue-500/20 transition-colors"
          >
            <LineChart className="h-3.5 w-3.5" />
            My Trades
            {activeTradesCount > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-500 text-white text-[10px] font-bold rounded-full px-1">
                {activeTradesCount}
              </span>
            )}
          </button>
          <button
            onClick={goToCopy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#1a1a2e] text-gray-400 text-xs font-medium active:bg-[#252542] transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            Copy Trading
          </button>
        </div>
      </div>
    </>
  );
}

// Memoize to prevent unnecessary re-renders when parent updates
export const MobileTradingPanel = memo(MobileTradingPanelComponent);
