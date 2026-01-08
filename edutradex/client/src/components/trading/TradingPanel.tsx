'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, DollarSign, Zap, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { getDefaultTradeAmount } from '@/lib/settings';
import { validateTrade } from '@/schemas/trade.schema';

interface TradingPanelProps {
  balance: number;
  onTrade: (direction: 'UP' | 'DOWN', amount?: number, duration?: number) => void;
  isLoading?: boolean;
  currentPrice?: number;
  payoutPercent?: number;
  isTradesPanelOpen?: boolean;
  initialDuration?: number;
  onDurationChange?: (duration: number) => void;
  amount?: number;
  onAmountChange?: (amount: number) => void;
  isDemoMode?: boolean;
  showShortcuts?: boolean;
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

export function TradingPanel({
  balance,
  onTrade,
  isLoading,
  payoutPercent = 98,
  isTradesPanelOpen = true,
  initialDuration,
  onDurationChange,
  amount: controlledAmount,
  onAmountChange,
  isDemoMode = false,
  showShortcuts = false,
}: TradingPanelProps) {
  const [internalAmount, setInternalAmount] = useState(10);
  const [duration, setDuration] = useState(60);

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
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [customHours, setCustomHours] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(1);
  const [customSeconds, setCustomSeconds] = useState(0);

  const potentialProfit = amount * (payoutPercent / 100);

  // Use Zod validation
  const validation = validateTrade(amount, duration, balance);
  const canTrade = validation.valid && !isLoading;

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    if (onDurationChange) {
      onDurationChange(newDuration);
    }
  };

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    if (canTrade) {
      onTrade(direction, amount, duration);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Desktop Panel Only - Mobile uses MobileTradingPanel component
  return (
    <div className={cn(
      "hidden md:flex w-60 bg-gradient-to-b from-[#1a1a2e] to-[#151528] border-l flex-col h-full",
      !isTradesPanelOpen && "mr-[68px]",
      isDemoMode ? "border-amber-500/30" : "border-[#2d2d44]/80"
    )}>
      {/* Demo Mode Indicator */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/15 to-amber-600/10 border-b border-amber-500/20 py-2 px-4 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-amber-400 text-xs font-semibold tracking-wide">DEMO MODE</span>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {/* Time Display Section */}
        <div className="p-4 border-b border-[#2d2d44]/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Expiration</span>
            <button
              onClick={() => setShowCustomDuration(!showCustomDuration)}
              className="flex items-center gap-1.5 text-[#1079ff] hover:text-[#3a93ff] transition-colors"
              title="Custom time"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Custom</span>
            </button>
          </div>

          {showCustomDuration ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1.5 font-medium">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={customHours}
                    onChange={(e) => setCustomHours(Math.max(0, Math.min(24, Number(e.target.value))))}
                    className="w-full px-2 py-2 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-sm text-center font-semibold focus:outline-none focus:border-[#1079ff] focus:ring-1 focus:ring-[#1079ff]/30 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1.5 font-medium">Min</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="w-full px-2 py-2 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-sm text-center font-semibold focus:outline-none focus:border-[#1079ff] focus:ring-1 focus:ring-[#1079ff]/30 transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 block mb-1.5 font-medium">Sec</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="w-full px-2 py-2 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-sm text-center font-semibold focus:outline-none focus:border-[#1079ff] focus:ring-1 focus:ring-[#1079ff]/30 transition-all"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const totalSeconds = customHours * 3600 + customMinutes * 60 + customSeconds;
                  if (totalSeconds >= 5 && totalSeconds <= 86400) {
                    handleDurationChange(totalSeconds);
                    setShowCustomDuration(false);
                  }
                }}
                className="w-full py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#2389ff] hover:to-[#1079ff] text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-[#1079ff]/20"
              >
                Set ({customHours > 0 ? `${customHours}h ` : ''}{customMinutes}m {customSeconds}s)
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="text-2xl font-mono font-bold text-white text-center py-3 bg-gradient-to-b from-[#252542] to-[#1f1f38] rounded-xl border border-[#3d3d5c]/80 shadow-inner">
                {formatDuration(duration)}
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-[#1079ff]/50 to-transparent rounded-full" />
            </div>
          )}

          {/* Duration buttons */}
          <div className="grid grid-cols-5 gap-1.5 mt-3">
            {DURATIONS.slice(0, 5).map((d) => (
              <button
                key={d.value}
                onClick={() => {
                  handleDurationChange(d.value);
                  setShowCustomDuration(false);
                }}
                className={cn(
                  'py-2 rounded-lg text-xs font-semibold transition-all',
                  duration === d.value && !showCustomDuration
                    ? 'bg-[#1079ff] text-white shadow-lg shadow-[#1079ff]/40'
                    : 'bg-[#252542]/80 text-slate-400 hover:bg-[#2d2d52] hover:text-white border border-transparent hover:border-[#3d3d5c]'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5 mt-1.5">
            {DURATIONS.slice(5, 10).map((d) => (
              <button
                key={d.value}
                onClick={() => {
                  handleDurationChange(d.value);
                  setShowCustomDuration(false);
                }}
                className={cn(
                  'py-2 rounded-lg text-xs font-semibold transition-all',
                  duration === d.value && !showCustomDuration
                    ? 'bg-[#1079ff] text-white shadow-lg shadow-[#1079ff]/40'
                    : 'bg-[#252542]/80 text-slate-400 hover:bg-[#2d2d52] hover:text-white border border-transparent hover:border-[#3d3d5c]'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input Section */}
        <div className="p-4 border-b border-[#2d2d44]/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Amount</span>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full pl-9 pr-4 py-3 bg-gradient-to-b from-[#252542] to-[#1f1f38] border border-[#3d3d5c]/80 rounded-xl text-white text-xl font-bold text-center focus:outline-none focus:border-[#1079ff] focus:ring-2 focus:ring-[#1079ff]/30 transition-all shadow-inner"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {QUICK_AMOUNTS.map((quickAmount, index) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount)}
                className={cn(
                  'py-2.5 rounded-lg text-sm font-semibold transition-all relative',
                  amount === quickAmount
                    ? 'bg-[#1079ff] text-white shadow-lg shadow-[#1079ff]/40'
                    : 'bg-[#252542]/80 text-slate-400 hover:bg-[#2d2d52] hover:text-white border border-transparent hover:border-[#3d3d5c]'
                )}
              >
                ${quickAmount >= 1000 ? `${quickAmount/1000}k` : quickAmount}
                {showShortcuts && index < 8 && (
                  <span className={cn(
                    'absolute top-1 right-1.5 text-[9px] font-mono',
                    amount === quickAmount ? 'text-white/40' : 'text-slate-600'
                  )}>
                    {index + 1}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Balance display */}
          <div className="flex items-center justify-between mt-3 px-1">
            <span className="text-slate-500 text-xs font-medium">Balance</span>
            <span className="text-[#1079ff] text-sm font-bold">{formatCurrency(balance)}</span>
          </div>

          {/* Validation Error */}
          {!validation.valid && validation.error && (
            <div className="mt-3 py-2 px-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span className="text-red-400 text-xs font-medium">
                {validation.error}
              </span>
            </div>
          )}
        </div>

        {/* Payout Display */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-[#1079ff]/10 to-[#092ab2]/5 rounded-xl p-3 border border-[#1079ff]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#1079ff]/20 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-[#1079ff]" />
                </div>
                <span className="text-slate-400 text-xs font-semibold">Payout</span>
              </div>
              <span className="text-xl font-bold text-emerald-400">+{payoutPercent}%</span>
            </div>
            <div className="mt-3 pt-3 border-t border-[#1079ff]/20 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Potential Profit</span>
                <span className="text-emerald-400 font-semibold">+${potentialProfit.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Total Return</span>
                <span className="text-white font-bold">${(amount + potentialProfit).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Buttons - Fixed at bottom */}
      <div className="p-4 border-t border-[#2d2d44]/60 space-y-2.5 flex-shrink-0 bg-gradient-to-t from-[#151528] to-transparent">
        <button
          onClick={() => handleTrade('UP')}
          disabled={!canTrade}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-900/50 disabled:to-emerald-900/50 disabled:cursor-not-allowed rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] group relative"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ArrowUp className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={3} />
              BUY
              {showShortcuts && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-200/50 font-mono">W</span>
              )}
            </>
          )}
        </button>

        <button
          onClick={() => handleTrade('DOWN')}
          disabled={!canTrade}
          className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-red-900/50 disabled:to-red-900/50 disabled:cursor-not-allowed rounded-xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-red-900/50 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] group relative"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ArrowDown className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" strokeWidth={3} />
              SELL
              {showShortcuts && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-200/50 font-mono">S</span>
              )}
            </>
          )}
        </button>

        {/* Keyboard Shortcuts Help */}
        {showShortcuts && (
          <div className="pt-2 flex items-center justify-center gap-4 text-[10px] text-slate-500">
            <span><kbd className="px-1.5 py-0.5 bg-[#252542] rounded text-slate-400 font-mono">1-8</kbd> Amount</span>
            <span><kbd className="px-1.5 py-0.5 bg-[#252542] rounded text-slate-400 font-mono">Q/E</kbd> Time</span>
          </div>
        )}
      </div>
    </div>
  );
}
