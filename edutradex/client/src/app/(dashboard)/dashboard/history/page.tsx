'use client';

import { useState, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type FilterType = 'all' | 'won' | 'lost';

export default function HistoryPage() {
  const { trades, stats, clearHistory } = useTradeStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');
  const [clearHistoryEnabled, setClearHistoryEnabled] = useState(false);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const response = await api.get<{ success: boolean; data: { value: string } }>('/settings/USER_CLEAR_HISTORY_ENABLED');
        if (response.success) {
          setClearHistoryEnabled(response.data.value === 'true');
        }
      } catch {
        // Setting not found or error - keep disabled by default
        setClearHistoryEnabled(false);
      }
    };
    fetchSetting();
  }, []);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all trade history? This action cannot be undone.')) {
      return;
    }
    try {
      await clearHistory();
      toast.success('Trade history cleared');
    } catch {
      toast.error('Failed to clear history');
    }
  };

  const filteredTrades = trades.filter((trade) => {
    if (trade.status === 'active') return false;
    if (filter === 'won' && trade.status !== 'won') return false;
    if (filter === 'lost' && trade.status !== 'lost') return false;

    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      if (new Date(trade.createdAt) < cutoff) return false;
    }

    return true;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, HH:mm');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  const handleExport = () => {
    if (filteredTrades.length === 0) {
      toast.error('No trades to export');
      return;
    }

    // CSV headers
    const headers = [
      'Date',
      'Asset',
      'Market Type',
      'Direction',
      'Amount ($)',
      'Duration',
      'Entry Price',
      'Exit Price',
      'Result',
      'Profit/Loss ($)',
    ];

    // Convert trades to CSV rows
    const rows = filteredTrades.map((trade) => [
      format(new Date(trade.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      trade.symbol,
      trade.marketType.toUpperCase(),
      trade.direction,
      trade.amount.toFixed(2),
      formatDuration(trade.duration),
      trade.entryPrice?.toFixed(5) || 'N/A',
      trade.exitPrice?.toFixed(5) || 'N/A',
      trade.status === 'won' ? 'PROFIT' : 'LOSS',
      (trade.profit || 0).toFixed(2),
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Add summary at the end
    const summary = [
      '',
      '',
      'Summary',
      `Total Trades,${filteredTrades.length}`,
      `Profit,${filteredTrades.filter((t) => t.status === 'won').length}`,
      `Loss,${filteredTrades.filter((t) => t.status === 'lost').length}`,
      `Total Profit/Loss,$${filteredTrades.reduce((sum, t) => sum + (t.profit || 0), 0).toFixed(2)}`,
      `Profit Rate,${stats.winRate.toFixed(1)}%`,
    ].join('\n');

    const fullCsv = csvContent + '\n' + summary;

    // Create and download file
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredTrades.length} trades`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trade History</h1>
          <p className="text-slate-400 mt-1">View all your past trades and performance</p>
        </div>
        <div className="flex items-center gap-2">
          {clearHistoryEnabled && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Trades</p>
          <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Profit</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.wonTrades}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Loss</p>
          <p className="text-2xl font-bold text-red-400">{stats.lostTrades}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Profit Rate</p>
          <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-slate-400 text-sm">Filter:</span>
        </div>
        <div className="flex gap-2">
          {(['all', 'won', 'lost'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              )}
            >
              {f === 'all' ? 'All' : f === 'won' ? 'Profit' : 'Loss'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm border-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Trade List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 text-slate-600 mx-auto" />
            <p className="text-slate-400 mt-4 text-lg">No trades found</p>
            <p className="text-slate-500 text-sm mt-1">
              Start trading to see your history here
            </p>
            <a
              href="/dashboard/trade"
              className="inline-block mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              Start Trading
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Asset
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Direction
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Result
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Profit/Loss
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredTrades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} formatDate={formatDate} formatDuration={formatDuration} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({
  trade,
  formatDate,
  formatDuration,
}: {
  trade: Trade;
  formatDate: (d: string) => string;
  formatDuration: (s: number) => string;
}) {
  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{trade.symbol}</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              trade.marketType === 'forex'
                ? 'bg-blue-600/20 text-blue-400'
                : 'bg-purple-600/20 text-purple-400'
            )}
          >
            {trade.marketType.toUpperCase()}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div
          className={cn(
            'flex items-center gap-1 font-medium',
            trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {trade.direction === 'UP' ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {trade.direction}
        </div>
      </td>
      <td className="px-6 py-4 text-white">${trade.amount.toFixed(2)}</td>
      <td className="px-6 py-4 text-slate-300">{formatDuration(trade.duration)}</td>
      <td className="px-6 py-4">
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            trade.status === 'won'
              ? 'bg-emerald-600/20 text-emerald-400'
              : 'bg-red-600/20 text-red-400'
          )}
        >
          {trade.status === 'won' ? 'PROFIT' : 'LOSS'}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className={cn(
            'font-medium flex items-center gap-1',
            (trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}
        >
          {(trade.profit || 0) >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
        </span>
      </td>
      <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(trade.createdAt)}</td>
    </tr>
  );
}
