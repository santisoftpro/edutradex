'use client';

import { useState, useEffect, memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUp, ArrowDown, Clock, DollarSign, Loader2, LineChart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDefaultTradeAmount } from '@/lib/settings';

interface MobileTradingPanelProps {
  balance: number;
  onTrade: (direction: 'UP' | 'DOWN', amount?: number, duration?: number) => void;
  isLoading?: boolean;
  payoutPercent?: number;
  onDurationChange?: (duration: number) => void;
  initialDuration?: number;
  amount?: number;
  onAmountChange?: (amount: number) => void;
  onOpenTrades?: () => void;
  onOpenCopyTrading?: () => void;
  activeTradesCount?: number;
  isDemoMode?: boolean;
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

const QUICK_AMOUNTS = [5, 10, 25, 50, 100, 500, 1000, 5000];

function MobileTradingPanelComponent({
  balance,
  onTrade,
  isLoading,
  payoutPercent = 98,
  onDurationChange,
  initialDuration,
  amount: controlledAmount,
  onAmountChange,
  onOpenTrades,
  onOpenCopyTrading,
  activeTradesCount = 0,
  isDemoMode = false,
}: MobileTradingPanelProps) {
  const router = useRouter();
  const [internalAmount, setInternalAmount] = useState(50);
  const [duration, setDuration] = useState(300);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [showAmountSheet, setShowAmountSheet] = useState(false);

  // Use controlled or internal amount
  const amount = controlledAmount ?? internalAmount;
  const setAmount = onAmountChange ?? setInternalAmount;

  // Load default amount from settings on mount (only if not controlled)
  useEffect(() => {
    if (controlledAmount === undefined) {
      const defaultAmount = getDefaultTradeAmount();
      if (defaultAmount && defaultAmount !== internalAmount) {
        setInternalAmount(defaultAmount);
      }
    }
  }, [controlledAmount]);

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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={() => setShowTimeSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#1a1a2e] to-[#151528] rounded-t-3xl z-[60] animate-in slide-in-from-bottom shadow-2xl">
            <div className="w-12 h-1.5 bg-[#3d3d5c] rounded-full mx-auto mt-3" />
            <div className="p-4 pb-8">
              <h3 className="text-white font-bold text-base text-center mb-1">Select Duration</h3>
              <p className="text-slate-500 text-xs text-center mb-4">Choose trade expiration time</p>
              <div className="grid grid-cols-5 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => handleDurationSelect(d.value)}
                    className={cn(
                      'py-3.5 rounded-xl font-semibold text-sm transition-all',
                      duration === d.value
                        ? 'bg-[#1079ff] text-white shadow-lg shadow-[#1079ff]/40'
                        : 'bg-[#252542]/80 text-slate-400 active:bg-[#2d2d52] border border-transparent active:border-[#3d3d5c]'
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            onClick={() => setShowAmountSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-b from-[#1a1a2e] to-[#151528] rounded-t-3xl z-[60] animate-in slide-in-from-bottom shadow-2xl">
            <div className="w-12 h-1.5 bg-[#3d3d5c] rounded-full mx-auto mt-3" />
            <div className="p-4 pb-8">
              <h3 className="text-white font-bold text-base text-center mb-1">Select Amount</h3>
              <p className="text-slate-500 text-xs text-center mb-4">Balance: <span className="text-[#1079ff] font-semibold">${balance.toFixed(2)}</span></p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => {
                      setAmount(quickAmount);
                      setShowAmountSheet(false);
                    }}
                    className={cn(
                      'py-3.5 rounded-xl font-semibold text-sm transition-all',
                      amount === quickAmount
                        ? 'bg-[#1079ff] text-white shadow-lg shadow-[#1079ff]/40'
                        : 'bg-[#252542]/80 text-slate-400 active:bg-[#2d2d52] border border-transparent active:border-[#3d3d5c]'
                    )}
                  >
                    ${quickAmount >= 1000 ? `${quickAmount/1000}k` : quickAmount}
                  </button>
                ))}
              </div>
              {/* Custom Amount */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-10 pr-4 py-4 bg-[#252542] border border-[#3d3d5c] rounded-xl text-white text-xl font-bold text-center focus:outline-none focus:border-[#1079ff] focus:ring-2 focus:ring-[#1079ff]/30 transition-all"
                  placeholder="Enter amount"
                />
              </div>
              <button
                onClick={() => setShowAmountSheet(false)}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#2389ff] hover:to-[#1079ff] text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-[#1079ff]/30"
              >
                Confirm Amount
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Trading Panel - Fixed at bottom with integrated nav */}
      <div className={cn(
        "md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#0d0d1a] to-[#121220] safe-area-bottom",
        isDemoMode && "border-t-2 border-t-amber-500/50"
      )}>
        {/* Time, Amount, Profit Row */}
        <div className={cn(
          "flex gap-2.5 px-3 pt-3",
          isDemoMode ? "border-t border-amber-500/20" : "border-t border-[#1a1a2e]"
        )}>
          {/* Time Input */}
          <button
            onClick={() => setShowTimeSheet(true)}
            className="flex-1 flex items-center justify-between bg-[#1a1a2e]/80 border border-[#2d2d44]/60 rounded-xl px-3 py-2.5 active:bg-[#252542] transition-all"
          >
            <div className="flex flex-col items-start">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">Time</span>
              <span className="text-white font-bold text-sm">{formatDuration(duration)}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#1079ff]/15 flex items-center justify-center">
              <Clock className="h-4 w-4 text-[#1079ff]" />
            </div>
          </button>

          {/* Amount Input */}
          <button
            onClick={() => setShowAmountSheet(true)}
            className="flex-1 flex items-center justify-between bg-[#1a1a2e]/80 border border-[#2d2d44]/60 rounded-xl px-3 py-2.5 active:bg-[#252542] transition-all"
          >
            <div className="flex flex-col items-start">
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide">Amount</span>
              <span className="text-white font-bold text-sm">${amount}</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#1079ff]/15 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-[#1079ff]" />
            </div>
          </button>

          {/* Payout Display */}
          <div className="flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/30 rounded-xl px-3 py-2.5 min-w-[70px]">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Payout</span>
            <span className="text-emerald-400 font-bold text-sm">+{payoutPercent}%</span>
          </div>
        </div>

        {/* Balance Warning */}
        {insufficientBalance && (
          <div className="mx-3 mt-2 py-2 px-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 text-xs">!</span>
            </div>
            <span className="text-red-400 text-xs font-medium">
              Need ${(amount - balance).toFixed(2)} more (Available: ${balance.toFixed(2)})
            </span>
          </div>
        )}

        {/* BUY and SELL Buttons */}
        <div className="flex gap-2.5 px-3 py-2.5">
          <button
            onClick={() => handleTrade('UP')}
            disabled={isLoading || insufficientBalance || invalidAmount}
            className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-900/50 disabled:to-emerald-900/50 disabled:cursor-not-allowed rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40 active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ArrowUp className="h-5 w-5" strokeWidth={3} />
                BUY
              </>
            )}
          </button>
          <button
            onClick={() => handleTrade('DOWN')}
            disabled={isLoading || insufficientBalance || invalidAmount}
            className="flex-1 py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-red-900/50 disabled:to-red-900/50 disabled:cursor-not-allowed rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/40 active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ArrowDown className="h-5 w-5" strokeWidth={3} />
                SELL
              </>
            )}
          </button>
        </div>

        {/* Inline Navigation - Trade & Copy */}
        <div className="flex items-center justify-center gap-3 px-3 pb-3 pt-1">
          <button
            onClick={onOpenTrades}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1079ff]/15 border border-[#1079ff]/30 text-[#1079ff] text-xs font-semibold active:bg-[#1079ff]/25 transition-all"
          >
            <LineChart className="h-4 w-4" />
            My Trades
            {activeTradesCount > 0 && (
              <span className="min-w-[20px] h-[20px] flex items-center justify-center bg-[#1079ff] text-white text-[10px] font-bold rounded-full px-1.5">
                {activeTradesCount}
              </span>
            )}
          </button>
          <button
            onClick={goToCopy}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#252542]/80 border border-[#3d3d5c]/50 text-slate-400 text-xs font-semibold active:bg-[#2d2d52] transition-all"
          >
            <Users className="h-4 w-4" />
            Copy Trading
          </button>
        </div>
      </div>
    </>
  );
}

// Memoize to prevent unnecessary re-renders when parent updates
export const MobileTradingPanel = memo(MobileTradingPanelComponent);
