'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  Smartphone,
  Bitcoin,
  RefreshCw,
  Loader2,
  Search,
  X,
  Copy,
  Check,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronRight,
  FileText,
  Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Deposit, Withdrawal, DepositStatus, WithdrawalStatus, DepositStats, WithdrawalStats } from '@/types';

type TransactionType = 'all' | 'deposit' | 'withdrawal';
type TransactionStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';
type DateRangeType = 'all' | 'today' | '7d' | '30d';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  method: string;
  status: DepositStatus | WithdrawalStatus;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  phoneNumber?: string;
  mobileProvider?: string;
  cryptoCurrency?: string;
  walletAddress?: string;
  network?: string;
  transactionHash?: string;
  adminNote?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  userId: string;
}

function StatusBadge({ status }: { status: DepositStatus | WithdrawalStatus }) {
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium text-amber-400 bg-amber-500/20">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium text-emerald-400 bg-emerald-500/20">
        <CheckCircle className="h-3 w-3" />
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium text-red-400 bg-red-500/20">
      <XCircle className="h-3 w-3" />
      Rejected
    </span>
  );
}

export default function AdminTransactionsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [depositStats, setDepositStats] = useState<DepositStats | null>(null);
  const [withdrawalStats, setWithdrawalStats] = useState<WithdrawalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected transaction for detail view
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [depositsRes, withdrawalsRes, depStats, withStats] = await Promise.all([
        api.getAdminDeposits({ limit: 200 }),
        api.getAdminWithdrawals({ limit: 200 }),
        api.getDepositStats(),
        api.getWithdrawalStats(),
      ]);
      setDeposits(depositsRes.data);
      setWithdrawals(withdrawalsRes.data);
      setDepositStats(depStats);
      setWithdrawalStats(withStats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Combine all transactions
  const allTransactions: Transaction[] = useMemo(() => {
    const depositTxs: Transaction[] = deposits.map(d => ({
      id: d.id,
      type: 'deposit' as const,
      amount: d.amount,
      method: d.method,
      status: d.status,
      createdAt: d.createdAt,
      processedAt: d.processedAt,
      processedBy: d.processedBy,
      phoneNumber: d.phoneNumber,
      mobileProvider: d.mobileProvider,
      cryptoCurrency: d.cryptoCurrency,
      walletAddress: d.walletAddress,
      transactionHash: d.transactionHash,
      adminNote: d.adminNote,
      user: d.user,
      userId: d.userId,
    }));

    const withdrawalTxs: Transaction[] = withdrawals.map(w => ({
      id: w.id,
      type: 'withdrawal' as const,
      amount: w.amount,
      method: w.method,
      status: w.status,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      processedBy: w.processedBy,
      phoneNumber: w.phoneNumber,
      mobileProvider: w.mobileProvider,
      cryptoCurrency: w.cryptoCurrency,
      walletAddress: w.walletAddress,
      network: w.network,
      adminNote: w.adminNote,
      user: w.user,
      userId: w.userId,
    }));

    return [...depositTxs, ...withdrawalTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [deposits, withdrawals]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    const query = searchQuery.toLowerCase().trim();

    return allTransactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (cutoff && new Date(tx.createdAt) < cutoff) return false;

      // Search by ID, user name, email, phone, wallet address
      if (query) {
        const matchesId = tx.id.toLowerCase().includes(query);
        const matchesUser = tx.user?.name?.toLowerCase().includes(query) || tx.user?.email?.toLowerCase().includes(query);
        const matchesPhone = tx.phoneNumber?.toLowerCase().includes(query);
        const matchesWallet = tx.walletAddress?.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);
        if (!matchesId && !matchesUser && !matchesPhone && !matchesWallet && !matchesAmount) return false;
      }

      return true;
    });
  }, [allTransactions, typeFilter, statusFilter, dateRange, searchQuery, getDateCutoff]);

  // Calculate combined stats
  const stats = useMemo(() => ({
    totalDeposits: depositStats?.totalVolume ?? 0,
    totalWithdrawals: withdrawalStats?.totalVolume ?? 0,
    pendingDeposits: depositStats?.pending ?? 0,
    pendingWithdrawals: withdrawalStats?.pending ?? 0,
    totalTransactions: allTransactions.length,
  }), [depositStats, withdrawalStats, allTransactions]);

  // Handle search by transaction ID
  const handleSearchById = () => {
    const query = searchQuery.trim();
    if (!query) return;

    const found = allTransactions.find(tx => tx.id.toLowerCase() === query.toLowerCase());
    if (found) {
      setSelectedTransaction(found);
      toast.success('Transaction found!');
    } else {
      toast.error('Transaction not found');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  const typeOptions: { value: TransactionType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'deposit', label: 'Deposits' },
    { value: 'withdrawal', label: 'Withdrawals' },
  ];

  const statusOptions: { value: TransactionStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  const dateOptions: { value: DateRangeType; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white">All Transactions</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Complete overview of deposits and withdrawals</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Deposits</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{formatCurrency(stats.totalDeposits)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-orange-500/20 rounded-lg">
              <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Withdrawals</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{formatCurrency(stats.totalWithdrawals)}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Pending Dep.</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{stats.pendingDeposits}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-[#1079ff]/20 rounded-lg">
              <Clock className="h-3.5 w-3.5 text-[#1079ff]" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Pending With.</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{stats.pendingWithdrawals}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-[#1079ff]/20 rounded-lg">
              <FileText className="h-3.5 w-3.5 text-[#1079ff]" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Total</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{stats.totalTransactions}</p>
        </div>
      </div>

      {/* Search by Transaction ID */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="h-4 w-4 text-[#1079ff]" />
          <span className="text-white text-sm font-medium">Verify Transaction by ID</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchById()}
              placeholder="Enter transaction ID, user name, email, phone, or wallet..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#1079ff]"
            />
          </div>
          <button
            onClick={handleSearchById}
            className="px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-sm font-medium rounded-lg transition-all"
          >
            Verify
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type Filter */}
        <div className="flex gap-1">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors',
                typeFilter === opt.value
                  ? 'bg-gradient-to-r from-[#1079ff] to-[#092ab2] text-white'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-white'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
          className="bg-slate-800/50 border border-slate-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#1079ff]"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Date Range */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRangeType)}
          className="bg-slate-800/50 border border-slate-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-emerald-500 ml-auto"
        >
          {dateOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      <div className="text-slate-400 text-xs sm:text-sm">
        Showing {filteredTransactions.length} of {allTransactions.length} transactions
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
          <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-4 text-sm sm:text-base">No transactions found</p>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">Try adjusting your filters or search query</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-slate-400 text-xs font-mono">{tx.id.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                        tx.type === 'deposit'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-orange-500/20 text-orange-400'
                      )}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownToLine className="h-3 w-3" />
                        ) : (
                          <ArrowUpFromLine className="h-3 w-3" />
                        )}
                        {tx.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm">{tx.user?.name || 'Unknown'}</p>
                        <p className="text-slate-500 text-xs">{tx.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'font-semibold text-sm',
                        tx.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                      )}>
                        {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.method === 'MOBILE_MONEY' ? (
                          <Smartphone className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Bitcoin className="h-4 w-4 text-amber-400" />
                        )}
                        <span className="text-white text-sm">
                          {tx.method === 'MOBILE_MONEY' ? tx.mobileProvider : tx.cryptoCurrency}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm">{format(new Date(tx.createdAt), 'MMM d, yyyy')}</p>
                        <p className="text-slate-500 text-xs">{format(new Date(tx.createdAt), 'HH:mm')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedTransaction(tx)}
                        className="p-2 text-[#1079ff] hover:text-[#3a93ff] hover:bg-[#1079ff]/10 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards */}
          <div className="lg:hidden space-y-2">
            {filteredTransactions.map((tx) => (
              <button
                key={tx.id}
                onClick={() => setSelectedTransaction(tx)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-left hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      tx.type === 'deposit' ? 'bg-emerald-500/20' : 'bg-orange-500/20'
                    )}>
                      {tx.type === 'deposit' ? (
                        <ArrowDownToLine className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ArrowUpFromLine className="h-4 w-4 text-orange-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{tx.user?.name || 'Unknown'}</p>
                      <p className="text-slate-500 text-[10px]">{tx.user?.email}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {tx.method === 'MOBILE_MONEY' ? (
                      <Smartphone className="h-3.5 w-3.5 text-blue-400" />
                    ) : (
                      <Bitcoin className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span className="text-slate-400 text-xs">
                      {tx.method === 'MOBILE_MONEY' ? tx.mobileProvider : tx.cryptoCurrency}
                    </span>
                  </div>
                  <StatusBadge status={tx.status} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <span className="text-slate-500 text-[10px]">
                    {format(new Date(tx.createdAt), 'MMM d, yyyy • HH:mm')}
                  </span>
                  <span className={cn(
                    'font-bold text-sm',
                    tx.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                  )}>
                    {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}

function TransactionDetailModal({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={cn(
          'sticky top-0 flex items-center justify-between p-4 border-b border-slate-700',
          transaction.type === 'deposit' ? 'bg-emerald-900/20' : 'bg-orange-900/20'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              transaction.type === 'deposit' ? 'bg-emerald-500/20' : 'bg-orange-500/20'
            )}>
              {transaction.type === 'deposit' ? (
                <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
              ) : (
                <ArrowUpFromLine className="h-5 w-5 text-orange-400" />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold capitalize">{transaction.type} Details</h3>
              <p className="text-slate-400 text-xs">Complete transaction information</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Amount */}
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
            <span className="text-slate-400 text-sm">Amount</span>
            <span className={cn(
              'font-bold text-xl',
              transaction.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
            )}>
              {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>

          {/* Transaction ID */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs">Transaction ID</span>
              <button
                onClick={() => copyToClipboard(transaction.id, 'Transaction ID')}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                {copied === 'Transaction ID' ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                )}
              </button>
            </div>
            <p className="text-white text-xs font-mono break-all">{transaction.id}</p>
          </div>

          {/* User Info */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 text-xs">User Information</span>
            </div>
            <div className="space-y-1">
              <p className="text-white text-sm font-medium">{transaction.user?.name || 'Unknown'}</p>
              <p className="text-slate-400 text-xs">{transaction.user?.email || '-'}</p>
              <p className="text-slate-500 text-[10px] font-mono">ID: {transaction.userId}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <DetailRow label="Status" value={<StatusBadge status={transaction.status} />} />
            <DetailRow
              label="Type"
              value={
                <span className={cn(
                  'capitalize font-medium',
                  transaction.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                )}>
                  {transaction.type}
                </span>
              }
            />
            <DetailRow
              label="Method"
              value={transaction.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cryptocurrency'}
            />
            {transaction.method === 'MOBILE_MONEY' ? (
              <>
                <DetailRow label="Provider" value={transaction.mobileProvider || '-'} />
                {transaction.phoneNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Phone Number</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{transaction.phoneNumber}</span>
                      <button
                        onClick={() => copyToClipboard(transaction.phoneNumber!, 'Phone')}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        {copied === 'Phone' ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <DetailRow label="Currency" value={transaction.cryptoCurrency || '-'} />
                {transaction.network && <DetailRow label="Network" value={transaction.network} />}
                {transaction.walletAddress && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs">Wallet Address</span>
                      <button
                        onClick={() => copyToClipboard(transaction.walletAddress!, 'Wallet')}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        {copied === 'Wallet' ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-white text-xs font-mono bg-slate-900 p-2 rounded-lg break-all">
                      {transaction.walletAddress}
                    </p>
                  </div>
                )}
                {transaction.transactionHash && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-400 text-xs">Transaction Hash</span>
                      <button
                        onClick={() => copyToClipboard(transaction.transactionHash!, 'Hash')}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                      >
                        {copied === 'Hash' ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3 text-slate-500" />
                        )}
                      </button>
                    </div>
                    <p className="text-white text-xs font-mono bg-slate-900 p-2 rounded-lg break-all">
                      {transaction.transactionHash}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Dates */}
            <div className="pt-2 border-t border-slate-700">
              <DetailRow
                label="Created"
                value={format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm:ss')}
              />
              {transaction.processedAt && (
                <DetailRow
                  label="Processed"
                  value={format(new Date(transaction.processedAt), 'MMM d, yyyy HH:mm:ss')}
                />
              )}
            </div>
          </div>

          {/* Admin Note */}
          {transaction.adminNote && (
            <div className="p-3 bg-slate-900 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Admin Note</p>
              <p className="text-white text-sm">{transaction.adminNote}</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => copyToClipboard(transaction.id, 'Transaction ID')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              {copied === 'Transaction ID' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy ID
            </button>
            {transaction.user?.email && (
              <button
                onClick={() => copyToClipboard(transaction.user!.email, 'Email')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                {copied === 'Email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy Email
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm">{label}</span>
      {typeof value === 'string' ? <span className="text-white text-sm">{value}</span> : value}
    </div>
  );
}
