'use client';

import { useState } from 'react';
import { X, Loader2, Percent, DollarSign, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import type { CopyTradingLeader, CopyMode } from '@/types';

interface FollowLeaderModalProps {
  leader: CopyTradingLeader;
  onClose: () => void;
  onSuccess: () => void;
}

export function FollowLeaderModal({
  leader,
  onClose,
  onSuccess,
}: FollowLeaderModalProps) {
  const { user } = useAuthStore();
  const [copyMode, setCopyMode] = useState<CopyMode>('PERCENTAGE');
  const [percentageAmount, setPercentageAmount] = useState(100);
  const [fixedAmount, setFixedAmount] = useState(10);
  const [dailyLossLimit, setDailyLossLimit] = useState<number | null>(null);
  const [dailyProfitLimit, setDailyProfitLimit] = useState<number | null>(null);
  const [maxDailyTrades, setMaxDailyTrades] = useState(50);
  const [unlimitedTrades, setUnlimitedTrades] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (copyMode === 'PERCENTAGE') {
      if (percentageAmount < 1 || percentageAmount > 1000) {
        toast.error('Percentage must be between 1% and 1000%');
        return;
      }
    } else {
      if (fixedAmount < 1) {
        toast.error('Minimum amount is $1');
        return;
      }
      if (fixedAmount > (user?.demoBalance || 0)) {
        toast.error('Amount exceeds your balance');
        return;
      }
    }

    if (!unlimitedTrades && maxDailyTrades < 1) {
      toast.error('Max daily trades must be at least 1');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.followLeader(leader.id, {
        copyMode,
        percentageAmount: copyMode === 'PERCENTAGE' ? percentageAmount : undefined,
        fixedAmount: copyMode === 'FIXED_AMOUNT' ? fixedAmount : undefined,
        dailyLossLimit: copyMode === 'FIXED_AMOUNT' ? dailyLossLimit : null,
        dailyProfitLimit: copyMode === 'FIXED_AMOUNT' ? dailyProfitLimit : null,
        maxDailyTrades: unlimitedTrades ? null : maxDailyTrades,
        unlimitedTrades,
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to follow leader');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-slate-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-full flex items-center justify-center text-white font-bold">
              {leader.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-white font-semibold">{leader.displayName}</h3>
              <p className="text-slate-500 text-xs">
                {leader.winRate.toFixed(0)}% win rate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCopyMode('PERCENTAGE')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-xl border transition-all',
                copyMode === 'PERCENTAGE'
                  ? 'border-[#1079ff] bg-[#1079ff]/10 text-[#1079ff]'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              )}
            >
              <Percent className="h-4 w-4" />
              <span className="text-sm font-medium">Percentage</span>
            </button>
            <button
              type="button"
              onClick={() => setCopyMode('FIXED_AMOUNT')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-xl border transition-all',
                copyMode === 'FIXED_AMOUNT'
                  ? 'border-[#1079ff] bg-[#1079ff]/10 text-[#1079ff]'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              )}
            >
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Fixed</span>
            </button>
          </div>

          {/* Percentage Settings */}
          {copyMode === 'PERCENTAGE' && (
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Copy percentage</label>
              <div className="relative">
                <input
                  type="number"
                  value={percentageAmount}
                  onChange={(e) => setPercentageAmount(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-full px-4 py-3 pr-12 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#1079ff]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5">
                Leader trades $100 → You trade ${(100 * percentageAmount / 100).toFixed(0)}
              </p>
            </div>
          )}

          {/* Fixed Amount Settings */}
          {copyMode === 'FIXED_AMOUNT' && (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Amount per trade</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                  <input
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(Number(e.target.value))}
                    min={1}
                    max={10000}
                    className="w-full pl-9 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#1079ff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Daily loss limit</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={dailyLossLimit ?? ''}
                      onChange={(e) => setDailyLossLimit(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                      placeholder="None"
                      className="w-full pl-9 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#1079ff]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1.5 block">Daily profit limit</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input
                      type="number"
                      value={dailyProfitLimit ?? ''}
                      onChange={(e) => setDailyProfitLimit(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                      placeholder="None"
                      className="w-full pl-9 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#1079ff]"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Max Daily Trades */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-500">Max daily trades</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unlimitedTrades}
                  onChange={(e) => setUnlimitedTrades(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#1079ff] focus:ring-[#1079ff]"
                />
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Infinity className="h-3 w-3" /> Unlimited
                </span>
              </label>
            </div>
            {!unlimitedTrades && (
              <input
                type="number"
                value={maxDailyTrades}
                onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
                min={1}
                max={500}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#1079ff]"
              />
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Follow'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
