'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowUp,
  ArrowDown,
  Calendar,
  Download,
  TrendingUp,
  Trash2,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Smartphone,
  Bitcoin,
  Copy,
  Check,
  RefreshCw,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTradeStore, useFilteredTrades, Trade } from '@/store/trade.store';
import { useAuthStore } from '@/store/auth.store';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { Deposit, Withdrawal } from '@/types';

type TabType = 'trades' | 'deposits' | 'withdrawals';
type TradeFilterType = 'all' | 'won' | 'lost';
type StatusFilterType = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
type DateRangeType = 'all' | 'today' | '7d' | '30d';

const ITEMS_PER_PAGE = 20;

export default function HistoryPage() {
  const { isHydrated } = useAuthStore();
  // Use filtered trades - only shows data for current account type (LIVE or DEMO)
  const trades = useFilteredTrades();
  const clearHistory = useTradeStore((state) => state.clearHistory);
  const syncFromApi = useTradeStore((state) => state.syncFromApi);

  const [activeTab, setActiveTab] = useState<TabType>('trades');
  const [tradeFilter, setTradeFilter] = useState<TradeFilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [clearHistoryEnabled, setClearHistoryEnabled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deposits & Withdrawals state
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTradesLoading, setIsTradesLoading] = useState(true);

  // Detail modal
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  // Ref for search input debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [tradeFilter, statusFilter, dateRange, searchQuery, activeTab]);

  useEffect(() => {
    const fetchSetting = async () => {
      try {
        const response = await api.get<{ success: boolean; data: { value: string } }>('/settings/USER_CLEAR_HISTORY_ENABLED');
        if (response.success) {
          setClearHistoryEnabled(response.data.value === 'true');
        }
      } catch {
        setClearHistoryEnabled(false);
      }
    };
    fetchSetting();
  }, []);

  // Initial trades sync
  useEffect(() => {
    const initTrades = async () => {
      setIsTradesLoading(true);
      try {
        await syncFromApi();
      } finally {
        setIsTradesLoading(false);
      }
    };
    if (isHydrated) {
      initTrades();
    }
  }, [isHydrated, syncFromApi]);

  const fetchDepositsAndWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        api.getMyDeposits({ limit: 100 }),
        api.getMyWithdrawals({ limit: 100 }),
      ]);
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'trades') {
      fetchDepositsAndWithdrawals();
    }
  }, [activeTab, fetchDepositsAndWithdrawals]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'trades') {
        await syncFromApi();
        toast.success('Trades refreshed');
      } else {
        await fetchDepositsAndWithdrawals();
        toast.success('Data refreshed');
      }
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 300);
  };

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

  const getDateCutoff = useCallback((range: DateRangeType): Date | null => {
    if (range === 'all') return null;

    const cutoff = new Date();

    if (range === 'today') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (range === '30d') {
      cutoff.setDate(cutoff.getDate() - 30);
    }

    return cutoff;
  }, []);

  // Closed trades (excluding active) - base for filtering
  const closedTrades = useMemo(() => {
    return trades.filter((trade) => trade.status !== 'active');
  }, [trades]);

  // Filtered trades based on all filters
  const filteredTrades = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const query = searchQuery.toLowerCase().trim();

    return closedTrades.filter((trade) => {
      if (tradeFilter === 'won' && trade.status !== 'won') return false;
      if (tradeFilter === 'lost' && trade.status !== 'lost') return false;
      if (cutoff && new Date(trade.createdAt) < cutoff) return false;
      if (query && !trade.symbol.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [closedTrades, tradeFilter, dateRange, searchQuery, getDateCutoff]);

  // Computed stats from filtered trades (updates with filters)
  const filteredStats = useMemo(() => {
    const wonTrades = filteredTrades.filter((t) => t.status === 'won').length;
    const lostTrades = filteredTrades.filter((t) => t.status === 'lost').length;
    const totalTrades = filteredTrades.length;
    const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.profit ?? 0), 0);
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;

    return { totalTrades, wonTrades, lostTrades, totalProfit, winRate };
  }, [filteredTrades]);

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE);
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTrades.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTrades, currentPage]);

  const filteredDeposits = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);

    return deposits.filter((deposit) => {
      if (statusFilter !== 'all' && deposit.status !== statusFilter) return false;
      if (cutoff && new Date(deposit.createdAt) < cutoff) return false;
      return true;
    });
  }, [deposits, statusFilter, dateRange, getDateCutoff]);

  const filteredWithdrawals = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);

    return withdrawals.filter((withdrawal) => {
      if (statusFilter !== 'all' && withdrawal.status !== statusFilter) return false;
      if (cutoff && new Date(withdrawal.createdAt) < cutoff) return false;
      return true;
    });
  }, [withdrawals, statusFilter, dateRange, getDateCutoff]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, HH:mm');
  };

  const formatFullDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy HH:mm');
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

    const headers = ['Date', 'Asset', 'Market Type', 'Direction', 'Amount ($)', 'Duration', 'Entry Price', 'Exit Price', 'Result', 'Profit/Loss ($)'];
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

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const summary = [
      '',
      '',
      'Summary',
      `Total Trades,${filteredStats.totalTrades}`,
      `Profit,${filteredStats.wonTrades}`,
      `Loss,${filteredStats.lostTrades}`,
      `Total Profit/Loss,$${filteredStats.totalProfit.toFixed(2)}`,
      `Win Rate,${filteredStats.winRate.toFixed(1)}%`
    ].join('\n');

    const blob = new Blob([csvContent + '\n' + summary], { type: 'text/csv;charset=utf-8;' });
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

  // Wait for hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number; filteredCount: number }[] = [
    { id: 'trades', label: 'Trades', icon: <TrendingUp className="h-4 w-4" />, count: closedTrades.length, filteredCount: filteredTrades.length },
    { id: 'deposits', label: 'Deposits', icon: <ArrowDownLeft className="h-4 w-4" />, count: deposits.length, filteredCount: filteredDeposits.length },
    { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowUpRight className="h-4 w-4" />, count: withdrawals.length, filteredCount: filteredWithdrawals.length },
  ];

  const hasActiveFilters = tradeFilter !== 'all' || dateRange !== 'all' || searchQuery !== '' || statusFilter !== 'all';

  const dateOptions: { value: DateRangeType; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Transaction History</h1>
            <p className="text-slate-400 text-xs sm:text-sm">View your trades, deposits and withdrawals</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs sm:text-sm rounded-lg transition-colors"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            {activeTab === 'trades' && (
              <>
                {clearHistoryEnabled && (
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs sm:text-sm rounded-lg transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                )}
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm rounded-lg transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl">
          {tabs.map((tab) => {
            const showFilteredCount = hasActiveFilters && activeTab === tab.id && tab.filteredCount !== tab.count;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setStatusFilter('all');
                  setTradeFilter('all');
                  setSearchQuery('');
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all',
                  activeTab === tab.id
                    ? 'bg-[#1079ff] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                {tab.icon}
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px]',
                  activeTab === tab.id ? 'bg-[#0d66d0]' : 'bg-slate-700'
                )}>
                  {showFilteredCount ? `${tab.filteredCount}/${tab.count}` : tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stats for Trades */}
        {activeTab === 'trades' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-[10px] sm:text-xs">Total Trades</p>
              <p className="text-lg sm:text-xl font-bold text-white">{filteredStats.totalTrades}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-[10px] sm:text-xs">Profit</p>
              <p className="text-lg sm:text-xl font-bold text-emerald-400">{filteredStats.wonTrades}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-[10px] sm:text-xs">Loss</p>
              <p className="text-lg sm:text-xl font-bold text-red-400">{filteredStats.lostTrades}</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-[10px] sm:text-xs">Win Rate</p>
              <p className="text-lg sm:text-xl font-bold text-white">{filteredStats.winRate.toFixed(1)}%</p>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-[10px] sm:text-xs">Total P&L</p>
              <p className={cn('text-lg sm:text-xl font-bold', filteredStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {filteredStats.totalProfit >= 0 ? '+' : ''}{formatCurrency(filteredStats.totalProfit)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {/* Trade Filters */}
          {activeTab === 'trades' && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              <div className="flex gap-1 flex-shrink-0">
                {(['all', 'won', 'lost'] as TradeFilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTradeFilter(f)}
                    className={cn(
                      'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                      tradeFilter === f
                        ? 'bg-[#1079ff] text-white'
                        : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white'
                    )}
                  >
                    {f === 'all' ? 'All' : f === 'won' ? 'Profit' : 'Loss'}
                  </button>
                ))}
              </div>
              {/* Search by symbol */}
              <div className="relative flex-shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-28 sm:w-36 bg-slate-800/50 border border-slate-700 text-white pl-8 pr-2.5 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#1079ff] placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Status Filters for Deposits/Withdrawals */}
          {activeTab !== 'trades' && (
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              {(['all', 'PENDING', 'APPROVED', 'REJECTED'] as StatusFilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    'px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
                    statusFilter === f
                      ? 'bg-[#1079ff] text-white'
                      : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'PENDING' ? 'Pending' : f === 'APPROVED' ? 'Done' : 'Rejected'}
                </button>
              ))}
            </div>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <Calendar className="h-3.5 w-3.5 text-slate-500 hidden sm:block" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeType)}
              className="flex-1 sm:flex-none bg-slate-800/50 border border-slate-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#1079ff]"
            >
              {dateOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'trades' && (
          <>
            <TradesContent
              trades={paginatedTrades}
              isLoading={isTradesLoading}
              formatDate={formatDate}
              formatDuration={formatDuration}
            />
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-400">
                  Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'deposits' && (
          <DepositsContent
            deposits={filteredDeposits}
            isLoading={isLoading}
            formatDate={formatDate}
            onViewDetails={setSelectedDeposit}
          />
        )}

        {activeTab === 'withdrawals' && (
          <WithdrawalsContent
            withdrawals={filteredWithdrawals}
            isLoading={isLoading}
            formatDate={formatDate}
            onViewDetails={setSelectedWithdrawal}
          />
        )}

        {/* Deposit Detail Modal */}
        {selectedDeposit && (
          <DetailModal
            title="Deposit Details"
            onClose={() => setSelectedDeposit(null)}
          >
            <DepositDetail deposit={selectedDeposit} formatDate={formatFullDate} />
          </DetailModal>
        )}

        {/* Withdrawal Detail Modal */}
        {selectedWithdrawal && (
          <DetailModal
            title="Withdrawal Details"
            onClose={() => setSelectedWithdrawal(null)}
          >
            <WithdrawalDetail withdrawal={selectedWithdrawal} formatDate={formatFullDate} />
          </DetailModal>
        )}
      </div>
    </div>
  );
}

// Trades Content
function TradesContent({
  trades,
  isLoading,
  formatDate,
  formatDuration,
}: {
  trades: Trade[];
  isLoading: boolean;
  formatDate: (d: string) => string;
  formatDuration: (s: number) => string;
}) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
        <TrendingUp className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-sm sm:text-base">No trades found</p>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">Start trading to see your history here</p>
        <a
          href="/dashboard/trade"
          className="inline-block mt-4 px-4 sm:px-6 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-sm rounded-lg transition-colors"
        >
          Start Trading
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Result</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Profit/Loss</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{trade.symbol}</span>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        trade.marketType === 'forex' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                      )}>
                        {trade.marketType.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('flex items-center gap-1 text-sm font-medium', trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400')}>
                      {trade.direction === 'UP' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white text-sm">${trade.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{formatDuration(trade.duration)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      trade.status === 'won' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
                    )}>
                      {trade.status === 'won' ? 'PROFIT' : 'LOSS'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-sm font-medium', (trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(trade.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {trades.map((trade) => (
          <div key={trade.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{trade.symbol}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded',
                  trade.marketType === 'forex' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                )}>
                  {trade.marketType.toUpperCase()}
                </span>
              </div>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium',
                trade.status === 'won' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'
              )}>
                {trade.status === 'won' ? 'PROFIT' : 'LOSS'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className={cn('flex items-center gap-0.5 font-medium', trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400')}>
                  {trade.direction === 'UP' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {trade.direction}
                </span>
                <span className="text-slate-400">${trade.amount.toFixed(2)}</span>
                <span className="text-slate-500">{formatDuration(trade.duration)}</span>
              </div>
              <span className={cn('text-sm font-bold', (trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] mt-2">{formatDate(trade.createdAt)}</p>
          </div>
        ))}
      </div>
    </>
  );
}

// Deposits Content
function DepositsContent({
  deposits,
  isLoading,
  formatDate,
  onViewDetails,
}: {
  deposits: Deposit[];
  isLoading: boolean;
  formatDate: (d: string) => string;
  onViewDetails: (d: Deposit) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (deposits.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
        <ArrowDownLeft className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-sm sm:text-base">No deposits found</p>
        <a
          href="/dashboard/deposit"
          className="inline-block mt-4 px-4 sm:px-6 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-sm rounded-lg transition-colors"
        >
          Make a Deposit
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {deposits.map((deposit) => (
              <tr key={deposit.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {deposit.method === 'MOBILE_MONEY' ? (
                      <Smartphone className="h-4 w-4 text-[#1079ff]" />
                    ) : (
                      <Bitcoin className="h-4 w-4 text-amber-400" />
                    )}
                    <span className="text-white text-sm">
                      {deposit.method === 'MOBILE_MONEY' ? deposit.mobileProvider : deposit.cryptoCurrency}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white font-medium text-sm">{formatCurrency(deposit.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={deposit.status} />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(deposit.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewDetails(deposit)}
                    className="text-[#1079ff] hover:text-[#3a93ff] text-xs"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {deposits.map((deposit) => (
          <button
            key={deposit.id}
            onClick={() => onViewDetails(deposit)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-left hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {deposit.method === 'MOBILE_MONEY' ? (
                  <div className="w-8 h-8 bg-[#1079ff]/20 rounded-lg flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-[#1079ff]" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Bitcoin className="h-4 w-4 text-amber-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">
                    {deposit.method === 'MOBILE_MONEY' ? deposit.mobileProvider : deposit.cryptoCurrency}
                  </p>
                  <p className="text-slate-500 text-[10px]">{formatDate(deposit.createdAt)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">{formatCurrency(deposit.amount)}</span>
              <StatusBadge status={deposit.status} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// Withdrawals Content
function WithdrawalsContent({
  withdrawals,
  isLoading,
  formatDate,
  onViewDetails,
}: {
  withdrawals: Withdrawal[];
  isLoading: boolean;
  formatDate: (d: string) => string;
  onViewDetails: (w: Withdrawal) => void;
}) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
        <ArrowUpRight className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-sm sm:text-base">No withdrawals found</p>
        <a
          href="/dashboard/withdraw"
          className="inline-block mt-4 px-4 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
        >
          Make a Withdrawal
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {withdrawals.map((withdrawal) => (
              <tr key={withdrawal.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {withdrawal.method === 'MOBILE_MONEY' ? (
                      <Smartphone className="h-4 w-4 text-purple-400" />
                    ) : (
                      <Bitcoin className="h-4 w-4 text-amber-400" />
                    )}
                    <span className="text-white text-sm">
                      {withdrawal.method === 'MOBILE_MONEY' ? withdrawal.mobileProvider : withdrawal.cryptoCurrency}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white font-medium text-sm">{formatCurrency(withdrawal.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={withdrawal.status} />
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(withdrawal.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewDetails(withdrawal)}
                    className="text-purple-400 hover:text-purple-300 text-xs"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {withdrawals.map((withdrawal) => (
          <button
            key={withdrawal.id}
            onClick={() => onViewDetails(withdrawal)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-left hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {withdrawal.method === 'MOBILE_MONEY' ? (
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-purple-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Bitcoin className="h-4 w-4 text-amber-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">
                    {withdrawal.method === 'MOBILE_MONEY' ? withdrawal.mobileProvider : withdrawal.cryptoCurrency}
                  </p>
                  <p className="text-slate-500 text-[10px]">{formatDate(withdrawal.createdAt)}</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white font-bold text-sm">{formatCurrency(withdrawal.amount)}</span>
              <StatusBadge status={withdrawal.status} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-400 bg-amber-500/20">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-400 bg-emerald-500/20">
        <CheckCircle className="h-3 w-3" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-red-400 bg-red-500/20">
      <XCircle className="h-3 w-3" />
      Rejected
    </span>
  );
}

// Detail Modal
function DetailModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Deposit Detail
function DepositDetail({ deposit, formatDate }: { deposit: Deposit; formatDate: (d: string) => string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
        <span className="text-slate-400 text-sm">Amount</span>
        <span className="text-white font-bold text-lg">{formatCurrency(deposit.amount)}</span>
      </div>

      <div className="space-y-3">
        <DetailRow label="Status" value={<StatusBadge status={deposit.status} />} />
        <DetailRow label="Method" value={deposit.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cryptocurrency'} />
        {deposit.method === 'MOBILE_MONEY' ? (
          <>
            <DetailRow label="Provider" value={deposit.mobileProvider || '-'} />
            <DetailRow label="Phone Number" value={deposit.phoneNumber || '-'} />
          </>
        ) : (
          <DetailRow label="Currency" value={deposit.cryptoCurrency || '-'} />
        )}
        <DetailRow label="Date" value={formatDate(deposit.createdAt)} />
        {deposit.processedAt && (
          <DetailRow label="Processed" value={formatDate(deposit.processedAt)} />
        )}
      </div>

      {deposit.adminNote && (
        <div className="p-3 bg-slate-900 rounded-lg">
          <p className="text-slate-400 text-xs mb-1">Admin Note</p>
          <p className="text-white text-sm">{deposit.adminNote}</p>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => copyToClipboard(deposit.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy Transaction ID
        </button>
      </div>
    </div>
  );
}

// Withdrawal Detail
function WithdrawalDetail({ withdrawal, formatDate }: { withdrawal: Withdrawal; formatDate: (d: string) => string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
        <span className="text-slate-400 text-sm">Amount</span>
        <span className="text-white font-bold text-lg">{formatCurrency(withdrawal.amount)}</span>
      </div>

      <div className="space-y-3">
        <DetailRow label="Status" value={<StatusBadge status={withdrawal.status} />} />
        <DetailRow label="Method" value={withdrawal.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cryptocurrency'} />
        {withdrawal.method === 'MOBILE_MONEY' ? (
          <>
            <DetailRow label="Provider" value={withdrawal.mobileProvider || '-'} />
            <DetailRow label="Phone Number" value={withdrawal.phoneNumber || '-'} />
          </>
        ) : (
          <>
            <DetailRow label="Currency" value={withdrawal.cryptoCurrency || '-'} />
            <DetailRow label="Network" value={withdrawal.network || '-'} />
            {withdrawal.walletAddress && (
              <div>
                <p className="text-slate-400 text-xs mb-1">Wallet Address</p>
                <p className="text-white text-xs font-mono bg-slate-900 p-2 rounded break-all">
                  {withdrawal.walletAddress}
                </p>
              </div>
            )}
          </>
        )}
        <DetailRow label="Date" value={formatDate(withdrawal.createdAt)} />
        {withdrawal.processedAt && (
          <DetailRow label="Processed" value={formatDate(withdrawal.processedAt)} />
        )}
      </div>

      {withdrawal.adminNote && (
        <div className="p-3 bg-slate-900 rounded-lg">
          <p className="text-slate-400 text-xs mb-1">Admin Note</p>
          <p className="text-white text-sm">{withdrawal.adminNote}</p>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => copyToClipboard(withdrawal.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Copy Transaction ID
        </button>
      </div>
    </div>
  );
}

// Detail Row Component
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm">{label}</span>
      {typeof value === 'string' ? <span className="text-white text-sm">{value}</span> : value}
    </div>
  );
}
