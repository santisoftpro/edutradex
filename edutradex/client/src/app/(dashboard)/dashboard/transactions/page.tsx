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
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ChevronRight,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Deposit, Withdrawal, DepositStatus, WithdrawalStatus } from '@/types';

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
  phoneNumber?: string;
  mobileProvider?: string;
  cryptoCurrency?: string;
  walletAddress?: string;
  network?: string;
  transactionHash?: string;
  adminNote?: string;
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
        Completed
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

export default function TransactionsPage() {
  const { isHydrated } = useAuthStore();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [dateRange, setDateRange] = useState<DateRangeType>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        api.getMyDeposits({ limit: 100 }),
        api.getMyWithdrawals({ limit: 100 }),
      ]);
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

  // Combine and transform transactions
  const allTransactions: Transaction[] = useMemo(() => {
    const depositTxs: Transaction[] = deposits.map(d => ({
      id: d.id,
      type: 'deposit' as const,
      amount: d.amount,
      method: d.method,
      status: d.status,
      createdAt: d.createdAt,
      processedAt: d.processedAt,
      phoneNumber: d.phoneNumber,
      mobileProvider: d.mobileProvider,
      cryptoCurrency: d.cryptoCurrency,
      walletAddress: d.walletAddress,
      transactionHash: d.transactionHash,
      adminNote: d.adminNote,
    }));

    const withdrawalTxs: Transaction[] = withdrawals.map(w => ({
      id: w.id,
      type: 'withdrawal' as const,
      amount: w.amount,
      method: w.method,
      status: w.status,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      phoneNumber: w.phoneNumber,
      mobileProvider: w.mobileProvider,
      cryptoCurrency: w.cryptoCurrency,
      walletAddress: w.walletAddress,
      network: w.network,
      adminNote: w.adminNote,
    }));

    return [...depositTxs, ...withdrawalTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [deposits, withdrawals]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);

    return allTransactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (cutoff && new Date(tx.createdAt) < cutoff) return false;
      return true;
    });
  }, [allTransactions, typeFilter, statusFilter, dateRange, getDateCutoff]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalDeposits = deposits.filter(d => d.status === 'APPROVED').reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.filter(w => w.status === 'APPROVED').reduce((sum, w) => sum + w.amount, 0);
    const pendingCount = allTransactions.filter(tx => tx.status === 'PENDING').length;
    const totalTransactions = allTransactions.length;

    return { totalDeposits, totalWithdrawals, pendingCount, totalTransactions };
  }, [deposits, withdrawals, allTransactions]);

  // Wait for hydration
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
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
    { value: 'APPROVED', label: 'Completed' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white">Transactions</h1>
            <p className="text-slate-400 text-xs sm:text-sm">Deposits and withdrawals</p>
          </div>
          <button
            onClick={() => fetchTransactions(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
              <span className="text-slate-400 text-[10px] sm:text-xs">Pending</span>
            </div>
            <p className="text-white text-sm sm:text-base font-bold">{stats.pendingCount}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-[#1079ff]/20 rounded-lg">
                <Wallet className="h-3.5 w-3.5 text-[#1079ff]" />
              </div>
              <span className="text-slate-400 text-[10px] sm:text-xs">Total</span>
            </div>
            <p className="text-white text-sm sm:text-base font-bold">{stats.totalTransactions}</p>
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
                    ? 'bg-[#1079ff] text-white'
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
            className="bg-slate-800/50 border border-slate-700 text-white px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#1079ff] ml-auto"
          >
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
            <Wallet className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto" />
            <p className="text-slate-400 mt-4 text-sm sm:text-base">No transactions found</p>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {allTransactions.length === 0
                ? 'Make a deposit or withdrawal to see your history'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
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
                          className="text-[#1079ff] hover:text-[#3a93ff] text-xs font-medium"
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
                        <p className="text-white font-medium text-sm capitalize">{tx.type}</p>
                        <p className="text-slate-500 text-[10px]">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy • HH:mm')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="flex items-center justify-between">
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
                  <div className="mt-2 pt-2 border-t border-slate-700/50">
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

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <TransactionDetailModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        )}
      </div>
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
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
              <p className="text-slate-400 text-xs">ID: {transaction.id.slice(0, 8)}...</p>
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
              'font-bold text-lg',
              transaction.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
            )}>
              {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <DetailRow label="Status" value={<StatusBadge status={transaction.status} />} />
            <DetailRow
              label="Method"
              value={transaction.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cryptocurrency'}
            />
            {transaction.method === 'MOBILE_MONEY' ? (
              <>
                <DetailRow label="Provider" value={transaction.mobileProvider || '-'} />
                <DetailRow label="Phone Number" value={transaction.phoneNumber || '-'} />
              </>
            ) : (
              <>
                <DetailRow label="Currency" value={transaction.cryptoCurrency || '-'} />
                {transaction.network && <DetailRow label="Network" value={transaction.network} />}
                {transaction.walletAddress && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Wallet Address</p>
                    <p className="text-white text-xs font-mono bg-slate-900 p-2 rounded-lg break-all">
                      {transaction.walletAddress}
                    </p>
                  </div>
                )}
                {transaction.transactionHash && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Transaction Hash</p>
                    <p className="text-white text-xs font-mono bg-slate-900 p-2 rounded-lg break-all">
                      {transaction.transactionHash}
                    </p>
                  </div>
                )}
              </>
            )}
            <DetailRow
              label="Date"
              value={format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}
            />
            {transaction.processedAt && (
              <DetailRow
                label="Processed"
                value={format(new Date(transaction.processedAt), 'MMM d, yyyy HH:mm')}
              />
            )}
          </div>

          {/* Admin Note */}
          {transaction.adminNote && (
            <div className="p-3 bg-slate-900 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Admin Note</p>
              <p className="text-white text-sm">{transaction.adminNote}</p>
            </div>
          )}

          {/* Copy ID Button */}
          <button
            onClick={() => copyToClipboard(transaction.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            Copy Transaction ID
          </button>
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
