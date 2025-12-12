'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  History,
  ArrowUp,
  ArrowDown,
  Loader2,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Search,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import type { CopiedTrade } from '@/types';

type FilterStatus = 'all' | 'won' | 'lost' | 'open';

export function CopyHistory() {
  const [trades, setTrades] = useState<CopiedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getCopyTradingHistory({ limit: 100 });
      setTrades(data.history || []);
    } catch (error) {
      console.error('Failed to load copy history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTrades = useMemo(() => {
    let result = trades;

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter((trade) => {
        if (filter === 'won') return trade.copiedTrade?.result === 'WIN';
        if (filter === 'lost') return trade.copiedTrade?.result === 'LOSS';
        if (filter === 'open') return trade.copiedTrade?.result === null;
        return true;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((trade) =>
        trade.copiedTrade?.symbol?.toLowerCase().includes(query) ||
        trade.leader?.displayName?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [trades, filter, searchQuery]);

  const stats = {
    total: trades.length,
    won: trades.filter((t) => t.copiedTrade?.result === 'WIN').length,
    lost: trades.filter((t) => t.copiedTrade?.result === 'LOSS').length,
    open: trades.filter((t) => t.copiedTrade?.result === null).length,
    totalProfit: trades.reduce((sum, t) => sum + (t.profit || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <History className="h-12 w-12 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4">No copy trade history</p>
        <p className="text-slate-500 text-sm mt-1">
          Your copied trades will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-emerald-400">{stats.won}</p>
          <p className="text-xs text-slate-400">Won</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-red-400">{stats.lost}</p>
          <p className="text-xs text-slate-400">Lost</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-amber-400">{stats.open}</p>
          <p className="text-xs text-slate-400">Open</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-center col-span-2 sm:col-span-1">
          <p className={cn(
            'text-lg font-bold',
            stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {formatCurrency(stats.totalProfit)}
          </p>
          <p className="text-xs text-slate-400">Profit</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by symbol or leader..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            {([
              { value: 'all', label: 'All' },
              { value: 'won', label: 'Won' },
              { value: 'lost', label: 'Lost' },
              { value: 'open', label: 'Open' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  filter === opt.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="space-y-2">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            {searchQuery ? 'No trades match your search' : 'No trades match the filter'}
          </div>
        ) : (
          filteredTrades.map((trade) => (
            <TradeHistoryCard key={trade.id} trade={trade} />
          ))
        )}
      </div>
    </div>
  );
}

function TradeHistoryCard({ trade }: { trade: CopiedTrade }) {
  const result = trade.copiedTrade?.result;
  const direction = trade.copiedTrade?.direction as 'UP' | 'DOWN';

  const getStatusIcon = () => {
    if (result === null) return <Clock className="h-4 w-4 text-amber-400" />;
    if (result === 'WIN') return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    if (result === 'LOSS') return <XCircle className="h-4 w-4 text-red-400" />;
    return <Clock className="h-4 w-4 text-slate-400" />;
  };

  const getResultText = () => {
    if (result === null) return 'Open';
    if (result === 'WIN') return 'Won';
    if (result === 'LOSS') return 'Lost';
    if (result === 'TIE') return 'Tie';
    return 'Closed';
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            direction === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
          )}>
            {direction === 'UP' ? (
              <ArrowUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-medium">{trade.copiedTrade?.symbol}</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded text-xs font-medium',
                direction === 'UP'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/20 text-red-400'
              )}>
                {direction}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Copied from {trade.leader?.displayName || 'Unknown'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            {getStatusIcon()}
            <span className={cn(
              'text-sm font-medium',
              result === null ? 'text-amber-400' :
              result === 'WIN' ? 'text-emerald-400' :
              result === 'LOSS' ? 'text-red-400' : 'text-slate-400'
            )}>
              {getResultText()}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {format(new Date(trade.createdAt), 'MMM d, HH:mm')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            Amount: <span className="text-white font-medium">{formatCurrency(trade.amount)}</span>
          </span>
        </div>
        {trade.profit !== null && result !== null && (
          <span className={cn(
            'text-sm font-medium',
            (trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {(trade.profit || 0) >= 0 ? '+' : ''}{formatCurrency(trade.profit || 0)}
          </span>
        )}
      </div>
    </div>
  );
}
