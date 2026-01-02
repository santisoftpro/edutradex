'use client';

import { useState, useEffect } from 'react';
import {
  Clock,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import type { PendingCopyTrade } from '@/types';

interface PendingTradesProps {
  onRefreshStats: () => void;
}

export function PendingTrades({ onRefreshStats }: PendingTradesProps) {
  const [pendingTrades, setPendingTrades] = useState<PendingCopyTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPendingTrades();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingTrades, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingTrades = async () => {
    try {
      const data = await api.getPendingCopyTrades();
      setPendingTrades(data);
    } catch (error) {
      console.error('Failed to load pending trades:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (tradeId: string) => {
    setProcessingIds((prev) => new Set(prev).add(tradeId));
    try {
      await api.approvePendingTrade(tradeId);
      toast.success('Trade copied successfully!');
      loadPendingTrades();
      onRefreshStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve trade');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(tradeId);
        return next;
      });
    }
  };

  const handleReject = async (tradeId: string) => {
    setProcessingIds((prev) => new Set(prev).add(tradeId));
    try {
      await api.rejectPendingTrade(tradeId);
      toast.success('Trade rejected');
      loadPendingTrades();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject trade');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(tradeId);
        return next;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (pendingTrades.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
        <Clock className="h-16 w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-lg">No pending trades</p>
        <p className="text-slate-500 text-sm mt-1">
          Trades from leaders you follow in manual mode will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-yellow-400 bg-yellow-600/10 border border-yellow-600/30 rounded-lg p-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm">
          These trades require your approval. They will expire if not acted upon before the trade closes.
        </p>
      </div>

      {pendingTrades.map((trade) => (
        <PendingTradeCard
          key={trade.id}
          trade={trade}
          isProcessing={processingIds.has(trade.id)}
          onApprove={() => handleApprove(trade.id)}
          onReject={() => handleReject(trade.id)}
        />
      ))}
    </div>
  );
}

interface PendingTradeCardProps {
  trade: PendingCopyTrade;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
}

function PendingTradeCard({
  trade,
  isProcessing,
  onApprove,
  onReject,
}: PendingTradeCardProps) {
  const [isExpired, setIsExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  // Update time-dependent values on client only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setIsExpired(new Date(trade.expiresAt) < new Date());
      setTimeLeft(formatDistanceToNow(new Date(trade.expiresAt), { addSuffix: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [trade.expiresAt]);

  return (
    <div className={cn(
      'bg-slate-800 rounded-xl border p-4',
      isExpired ? 'border-red-600/30 opacity-60' : 'border-slate-700'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Direction */}
          <div className={cn(
            'h-12 w-12 rounded-lg flex items-center justify-center',
            trade.direction === 'UP' ? 'bg-emerald-600/20' : 'bg-red-600/20'
          )}>
            {trade.direction === 'UP' ? (
              <ArrowUp className="h-6 w-6 text-emerald-400" />
            ) : (
              <ArrowDown className="h-6 w-6 text-red-400" />
            )}
          </div>

          {/* Trade Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold">{trade.symbol}</span>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs font-medium',
                trade.direction === 'UP'
                  ? 'bg-emerald-600/20 text-emerald-400'
                  : 'bg-red-600/20 text-red-400'
              )}>
                {trade.direction}
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              From: {trade.leader?.displayName || 'Unknown Leader'}
            </p>
          </div>
        </div>

        {/* Amount & Time */}
        <div className="text-right">
          <p className="text-white font-semibold">${trade.suggestedAmount.toFixed(2)}</p>
          <p className={cn(
            'text-sm flex items-center gap-1 justify-end',
            isExpired ? 'text-red-400' : 'text-slate-400'
          )}>
            <Clock className="h-3 w-3" />
            {isExpired ? 'Expired' : `Expires ${timeLeft}`}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!isExpired && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-red-600/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4" />
                Reject
              </>
            )}
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4" />
                Copy Trade
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
