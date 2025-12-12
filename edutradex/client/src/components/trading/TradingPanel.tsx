'use client';

import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, DollarSign, Zap, Edit3, Loader2 } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { getDefaultTradeAmount } from '@/lib/settings';

interface TradingPanelProps {
  balance: number;
  onTrade: (direction: 'UP' | 'DOWN', amount: number, duration: number) => void;
  isLoading?: boolean;
  currentPrice?: number;
  payoutPercent?: number;
  isTradesPanelOpen?: boolean;
  initialDuration?: number;
  onDurationChange?: (duration: number) => void;
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

export function TradingPanel({ balance, onTrade, isLoading, payoutPercent = 98, isTradesPanelOpen = true, initialDuration, onDurationChange }: TradingPanelProps) {
  const [amount, setAmount] = useState(10);
  const [duration, setDuration] = useState(60);

  // Load default amount from settings on mount
  useEffect(() => {
    const defaultAmount = getDefaultTradeAmount();
    if (defaultAmount && defaultAmount !== amount) {
      setAmount(defaultAmount);
    }
  }, []);

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
  const insufficientBalance = amount > balance;
  const invalidAmount = amount <= 0;

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    if (onDurationChange) {
      onDurationChange(newDuration);
    }
  };

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    if (amount > 0 && amount <= balance) {
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
      "hidden md:flex w-56 bg-[#1a1a2e] border-l border-[#2d2d44] flex-col h-full",
      !isTradesPanelOpen && "mr-[68px]"
    )}>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {/* Time Display */}
        <div className="p-3 border-b border-[#2d2d44]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">Expiration</span>
            <button
              onClick={() => setShowCustomDuration(!showCustomDuration)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              title="Custom time"
            >
              <Edit3 className="h-3 w-3" />
              <span className="text-[10px]">Custom</span>
            </button>
          </div>

          {showCustomDuration ? (
            <div className="space-y-2">
              <div className="flex gap-1">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={customHours}
                    onChange={(e) => setCustomHours(Math.max(0, Math.min(24, Number(e.target.value))))}
                    className="w-full px-1 py-1.5 bg-[#252542] border border-[#3d3d5c] rounded text-white text-sm text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-1">Min</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="w-full px-1 py-1.5 bg-[#252542] border border-[#3d3d5c] rounded text-white text-sm text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 block mb-1">Sec</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSeconds}
                    onChange={(e) => setCustomSeconds(Math.max(0, Math.min(59, Number(e.target.value))))}
                    className="w-full px-1 py-1.5 bg-[#252542] border border-[#3d3d5c] rounded text-white text-sm text-center focus:outline-none focus:border-blue-500"
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
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors"
              >
                Set ({customHours > 0 ? `${customHours}h ` : ''}{customMinutes}m {customSeconds}s)
              </button>
            </div>
          ) : (
            <div className="text-xl font-mono font-bold text-white text-center py-2 bg-gradient-to-b from-[#252542] to-[#1f1f38] rounded-lg border border-[#3d3d5c]">
              {formatDuration(duration)}
            </div>
          )}

          {/* Duration buttons */}
          <div className="grid grid-cols-5 gap-1 mt-2">
            {DURATIONS.slice(0, 10).map((d) => (
              <button
                key={d.value}
                onClick={() => {
                  handleDurationChange(d.value);
                  setShowCustomDuration(false);
                }}
                className={cn(
                  'py-1.5 rounded-md text-[10px] font-semibold transition-all',
                  duration === d.value && !showCustomDuration
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="p-3 border-b border-[#2d2d44]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-[10px] font-medium uppercase tracking-wide">Amount</span>
            <DollarSign className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
              className="w-full pl-7 pr-3 py-2 bg-gradient-to-b from-[#252542] to-[#1f1f38] border border-[#3d3d5c] rounded-lg text-white text-lg font-bold text-center focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-1.5 mt-2">
            {QUICK_AMOUNTS.map((quickAmount) => (
              <button
                key={quickAmount}
                onClick={() => setAmount(quickAmount)}
                className={cn(
                  'py-1.5 rounded-md text-xs font-semibold transition-all',
                  amount === quickAmount
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                )}
              >
                ${quickAmount}
              </button>
            ))}
          </div>

          {/* Balance display */}
          <div className="flex items-center justify-between mt-2 px-0.5">
            <span className="text-gray-500 text-[10px]">Balance</span>
            <span className="text-emerald-400 text-xs font-bold">{formatCurrency(balance)}</span>
          </div>

          {/* Balance Warning */}
          {insufficientBalance && (
            <div className="mt-2 py-1.5 px-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <span className="text-red-400 text-[10px] font-medium">
                Insufficient balance
              </span>
            </div>
          )}
        </div>

        {/* Payout Display */}
        <div className="p-3">
          <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/10 rounded-lg p-2.5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-gray-400 text-[10px] font-medium">Payout</span>
              </div>
              <span className="text-lg font-bold text-emerald-400">+{payoutPercent}%</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-emerald-500/20 text-[10px]">
              <span className="text-gray-400">Profit</span>
              <span className="text-emerald-300 font-semibold">+${potentialProfit.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mt-0.5 text-[10px]">
              <span className="text-gray-400">Return</span>
              <span className="text-emerald-400 font-bold">${(amount + potentialProfit).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Buttons - Fixed at bottom */}
      <div className="p-3 border-t border-[#2d2d44] space-y-2 flex-shrink-0">
        <button
          onClick={() => handleTrade('UP')}
          disabled={isLoading || amount > balance || amount <= 0}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-emerald-900 disabled:to-emerald-900 disabled:cursor-not-allowed rounded-lg font-bold text-white text-sm flex items-center justify-center gap-1.5 transition-all duration-200 shadow-lg shadow-emerald-900/50 hover:shadow-emerald-500/40 active:scale-[0.98] group"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ArrowUp className="h-5 w-5 group-hover:-translate-y-0.5 transition-transform" strokeWidth={3} />
              BUY
            </>
          )}
        </button>

        <button
          onClick={() => handleTrade('DOWN')}
          disabled={isLoading || amount > balance || amount <= 0}
          className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-red-900 disabled:to-red-900 disabled:cursor-not-allowed rounded-lg font-bold text-white text-sm flex items-center justify-center gap-1.5 transition-all duration-200 shadow-lg shadow-red-900/50 hover:shadow-red-500/40 active:scale-[0.98] group"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ArrowDown className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" strokeWidth={3} />
              SELL
            </>
          )}
        </button>
      </div>
    </div>
  );
}
