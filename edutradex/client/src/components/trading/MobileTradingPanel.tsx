'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTradingPanelProps {
  balance: number;
  onTrade: (direction: 'UP' | 'DOWN', amount: number, duration: number) => void;
  isLoading?: boolean;
  payoutPercent?: number;
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

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500, 1000, 5000];

export function MobileTradingPanel({
  balance,
  onTrade,
  isLoading,
  payoutPercent = 79,
  onDurationChange,
}: MobileTradingPanelProps) {
  const [amount, setAmount] = useState(50);
  const [duration, setDuration] = useState(300);
  const [showTimeSheet, setShowTimeSheet] = useState(false);
  const [showAmountSheet, setShowAmountSheet] = useState(false);

  const potentialProfit = amount * (payoutPercent / 100);
  const payout = amount + potentialProfit;

  const handleTrade = (direction: 'UP' | 'DOWN') => {
    if (amount > 0 && amount <= balance && !isLoading) {
      onTrade(direction, amount, duration);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDurationSelect = (value: number) => {
    setDuration(value);
    setShowTimeSheet(false);
    if (onDurationChange) {
      onDurationChange(value);
    }
  };

  return (
    <>
      {/* Time Selection Bottom Sheet */}
      {showTimeSheet && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setShowTimeSheet(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-3xl z-[60] animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mt-3" />
            <div className="p-4 pb-8">
              <h3 className="text-white font-semibold text-lg text-center mb-4">Select Time</h3>
              <div className="grid grid-cols-5 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => handleDurationSelect(d.value)}
                    className={cn(
                      'py-3 rounded-xl font-semibold text-sm transition-all',
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
          <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-3xl z-[60] animate-in slide-in-from-bottom">
            <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mt-3" />
            <div className="p-4 pb-8">
              <h3 className="text-white font-semibold text-lg text-center mb-1">Select Amount</h3>
              <p className="text-gray-500 text-xs text-center mb-4">Balance: ${balance.toFixed(2)}</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {QUICK_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => {
                      setAmount(quickAmount);
                      setShowAmountSheet(false);
                    }}
                    className={cn(
                      'py-3 rounded-xl font-semibold text-sm transition-all',
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
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-10 pr-4 py-4 bg-[#252542] border border-[#3d3d5c] rounded-xl text-white text-xl font-bold text-center focus:outline-none focus:border-emerald-500"
                  placeholder="Enter amount"
                />
              </div>
              <button
                onClick={() => setShowAmountSheet(false)}
                className="w-full mt-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Trading Panel - Fixed above bottom nav (68px for nav height) */}
      <div className="md:hidden fixed bottom-[68px] left-0 right-0 z-40 bg-[#0d0d1a]">
        {/* Time and Amount Labels */}
        <div className="flex px-4 pt-3 border-t border-[#1a1a2e]">
          <span className="flex-1 text-gray-500 text-xs">Time</span>
          <span className="flex-1 text-gray-500 text-xs pl-3">Amount</span>
        </div>

        {/* Time and Amount Inputs Row */}
        <div className="flex gap-3 px-4 py-2">
          {/* Time Input */}
          <button
            onClick={() => setShowTimeSheet(true)}
            className="flex-1 flex items-center justify-between bg-[#1a1a2e] border border-[#2d2d44] rounded-xl px-4 py-3"
          >
            <span className="text-white font-bold text-lg font-mono">{formatDuration(duration)}</span>
            <Clock className="h-5 w-5 text-gray-500" />
          </button>

          {/* Amount Input */}
          <button
            onClick={() => setShowAmountSheet(true)}
            className="flex-1 flex items-center justify-between bg-[#1a1a2e] border border-[#2d2d44] rounded-xl px-4 py-3"
          >
            <span className="text-white font-bold text-lg">{amount}</span>
            <DollarSign className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Payout Info Row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs">Payout</span>
            <span className="text-white text-sm font-medium">${payout.toFixed(2)}</span>
          </div>
          <span className="text-emerald-400 font-bold text-xl">+{payoutPercent}%</span>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 text-xs">Profit</span>
            <span className="text-emerald-400 text-sm font-medium">+${potentialProfit.toFixed(2)}</span>
          </div>
        </div>

        {/* BUY and SELL Buttons */}
        <div className="flex gap-3 px-4 pb-3">
          <button
            onClick={() => handleTrade('UP')}
            disabled={isLoading || amount > balance || amount <= 0}
            className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-900/50 disabled:cursor-not-allowed rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            <ArrowUp className="h-6 w-6" strokeWidth={2.5} />
            BUY
          </button>
          <button
            onClick={() => handleTrade('DOWN')}
            disabled={isLoading || amount > balance || amount <= 0}
            className="flex-1 py-4 bg-red-500 hover:bg-red-400 disabled:bg-red-900/50 disabled:cursor-not-allowed rounded-xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
          >
            <ArrowDown className="h-6 w-6" strokeWidth={2.5} />
            SELL
          </button>
        </div>
      </div>
    </>
  );
}
