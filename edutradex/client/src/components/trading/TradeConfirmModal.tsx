'use client';

import { useEffect, useCallback } from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, X } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface TradeConfirmModalProps {
  isOpen: boolean;
  direction: 'UP' | 'DOWN';
  symbol: string;
  amount: number;
  duration: number;
  payout: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TradeConfirmModal({
  isOpen,
  direction,
  symbol,
  amount,
  duration,
  payout,
  onConfirm,
  onCancel,
}: TradeConfirmModalProps) {
  const potentialProfit = amount * (payout / 100);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    return `${secs}s`;
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  }, [onCancel, onConfirm]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isUp = direction === 'UP';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] rounded-2xl w-full max-w-sm border border-[#2d2d44] shadow-2xl animate-in zoom-in-95 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2d2d44]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white">Confirm Large Trade</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#252542] rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-slate-400 text-sm">
            You are about to place a trade of <span className="text-white font-bold">{formatCurrency(amount)}</span>. Please confirm this action.
          </p>

          {/* Trade Summary */}
          <div className="bg-[#252542]/50 rounded-xl p-4 space-y-3">
            {/* Direction & Symbol */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Trade</span>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold',
                  isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                )}>
                  {isUp ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  {isUp ? 'BUY' : 'SELL'}
                </div>
                <span className="text-white font-semibold">{symbol}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Amount</span>
              <span className="text-white font-bold text-lg">{formatCurrency(amount)}</span>
            </div>

            {/* Duration */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Duration</span>
              <span className="text-white font-medium">{formatDuration(duration)}</span>
            </div>

            {/* Potential Profit */}
            <div className="flex items-center justify-between pt-2 border-t border-[#3d3d5c]">
              <span className="text-slate-400 text-sm">Potential Profit</span>
              <span className="text-emerald-400 font-bold">+{formatCurrency(potentialProfit)}</span>
            </div>

            {/* Potential Loss */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Potential Loss</span>
              <span className="text-red-400 font-bold">-{formatCurrency(amount)}</span>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/90">
              This is a high-value trade. Make sure you understand the risks involved.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-[#2d2d44]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-[#252542] text-white font-semibold rounded-xl hover:bg-[#2d2d52] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 px-4 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2',
              isUp
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
                : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
            )}
          >
            {isUp ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
            Confirm Trade
          </button>
        </div>
      </div>
    </div>
  );
}
