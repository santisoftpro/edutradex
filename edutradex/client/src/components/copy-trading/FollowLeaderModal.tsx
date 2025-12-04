'use client';

import { useState } from 'react';
import { X, Loader2, Zap, Hand } from 'lucide-react';
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
  const [copyMode, setCopyMode] = useState<CopyMode>('AUTOMATIC');
  const [fixedAmount, setFixedAmount] = useState(10);
  const [maxDailyTrades, setMaxDailyTrades] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fixedAmount < 1) {
      toast.error('Minimum amount is $1');
      return;
    }

    if (fixedAmount > (user?.demoBalance || 0)) {
      toast.error('Amount exceeds your balance');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.followLeader(leader.id, {
        copyMode,
        fixedAmount,
        maxDailyTrades,
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to follow leader');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Follow Leader</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Leader Info */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {leader.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-white font-semibold">{leader.displayName}</h3>
              <p className="text-slate-400 text-sm">
                Win Rate: {leader.winRate.toFixed(1)}% | {leader.followerCount} followers
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Copy Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Copy Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCopyMode('AUTOMATIC')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  copyMode === 'AUTOMATIC'
                    ? 'border-emerald-500 bg-emerald-600/10'
                    : 'border-slate-600 hover:border-slate-500'
                )}
              >
                <Zap className={cn(
                  'h-6 w-6',
                  copyMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-slate-400'
                )} />
                <span className={cn(
                  'font-medium',
                  copyMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-slate-300'
                )}>
                  Automatic
                </span>
                <span className="text-xs text-slate-500 text-center">
                  Trades copied instantly
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('MANUAL')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  copyMode === 'MANUAL'
                    ? 'border-blue-500 bg-blue-600/10'
                    : 'border-slate-600 hover:border-slate-500'
                )}
              >
                <Hand className={cn(
                  'h-6 w-6',
                  copyMode === 'MANUAL' ? 'text-blue-400' : 'text-slate-400'
                )} />
                <span className={cn(
                  'font-medium',
                  copyMode === 'MANUAL' ? 'text-blue-400' : 'text-slate-300'
                )}>
                  Manual
                </span>
                <span className="text-xs text-slate-500 text-center">
                  Approve each trade
                </span>
              </button>
            </div>
          </div>

          {/* Fixed Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fixed Amount Per Trade
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(Number(e.target.value))}
                min={1}
                max={10000}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Your balance: ${user?.demoBalance?.toFixed(2) || 0}
            </p>
          </div>

          {/* Max Daily Trades */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Max Daily Trades
            </label>
            <input
              type="number"
              value={maxDailyTrades}
              onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
              min={1}
              max={500}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white rounded-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Following...
                </>
              ) : (
                'Follow Leader'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
