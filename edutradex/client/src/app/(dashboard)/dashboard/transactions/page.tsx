'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Calendar,
  Smartphone,
  Bitcoin,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { Deposit, Withdrawal, DepositStatus, WithdrawalStatus } from '@/types';

type TransactionType = 'all' | 'deposit' | 'withdrawal';
type TransactionStatus = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

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
  transactionHash?: string;
  adminNote?: string;
}

function StatusBadge({ status }: { status: DepositStatus | WithdrawalStatus }) {
  const config = {
    PENDING: { icon: Clock, color: 'text-amber-400 bg-amber-500/20 border-amber-500/30', label: 'Pending' },
    APPROVED: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30', label: 'Approved' },
    REJECTED: { icon: XCircle, color: 'text-red-400 bg-red-500/20 border-red-500/30', label: 'Rejected' },
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: 'deposit' | 'withdrawal' }) {
  if (type === 'deposit') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <ArrowDownToLine className="h-3 w-3" />
        Deposit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
      <ArrowUpFromLine className="h-3 w-3" />
      Withdrawal
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  if (method === 'MOBILE_MONEY') {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <Smartphone className="h-4 w-4 text-blue-400" />
        Mobile Money
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-300">
      <Bitcoin className="h-4 w-4 text-orange-400" />
      Crypto
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', color)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-white text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [depositsData, withdrawalsData] = await Promise.all([
        api.getMyDeposits(),
        api.getMyWithdrawals(),
      ]);
      setDeposits(depositsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
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
      adminNote: w.adminNote,
    }));

    return [...depositTxs, ...withdrawalTxs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [deposits, withdrawals]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesAmount = tx.amount.toString().includes(query);
        const matchesMethod = tx.method.toLowerCase().includes(query);
        const matchesProvider = tx.mobileProvider?.toLowerCase().includes(query);
        const matchesCrypto = tx.cryptoCurrency?.toLowerCase().includes(query);
        if (!matchesAmount && !matchesMethod && !matchesProvider && !matchesCrypto) return false;
      }
      return true;
    });
  }, [allTransactions, typeFilter, statusFilter, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalDeposits = deposits.filter(d => d.status === 'APPROVED').reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.filter(w => w.status === 'APPROVED').reduce((sum, w) => sum + w.amount, 0);
    const pendingCount = allTransactions.filter(tx => tx.status === 'PENDING').length;
    const totalTransactions = allTransactions.length;

    return { totalDeposits, totalWithdrawals, pendingCount, totalTransactions };
  }, [deposits, withdrawals, allTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
          <p className="text-slate-400 mt-3">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-slate-400 mt-1">View all your deposits and withdrawals</p>
        </div>
        <button
          onClick={() => fetchTransactions(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Deposits"
          value={formatCurrency(stats.totalDeposits)}
          icon={TrendingUp}
          color="bg-emerald-600"
        />
        <StatCard
          title="Total Withdrawals"
          value={formatCurrency(stats.totalWithdrawals)}
          icon={TrendingDown}
          color="bg-orange-600"
        />
        <StatCard
          title="Pending"
          value={stats.pendingCount.toString()}
          icon={Clock}
          color="bg-amber-600"
        />
        <StatCard
          title="All Transactions"
          value={stats.totalTransactions.toString()}
          icon={Wallet}
          color="bg-blue-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by amount, method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TransactionType)}
              className="px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TransactionStatus)}
            className="px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="h-16 w-16 text-slate-600 mx-auto" />
            <p className="text-slate-400 mt-4 text-lg">No transactions found</p>
            <p className="text-slate-500 text-sm mt-1">
              {allTransactions.length === 0
                ? 'Make a deposit or withdrawal to see your transaction history'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Method</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TypeBadge type={tx.type} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'text-lg font-semibold',
                          tx.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                        )}>
                          {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MethodBadge method={tx.method} />
                        {tx.mobileProvider && (
                          <p className="text-xs text-slate-500 mt-1">{tx.mobileProvider}</p>
                        )}
                        {tx.cryptoCurrency && (
                          <p className="text-xs text-slate-500 mt-1">{tx.cryptoCurrency}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={tx.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-white text-sm">{format(new Date(tx.createdAt), 'MMM d, yyyy')}</p>
                          <p className="text-slate-500 text-xs">{format(new Date(tx.createdAt), 'HH:mm')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTransaction(tx)}
                          className="text-emerald-500 hover:text-emerald-400 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile List */}
            <div className="md:hidden divide-y divide-slate-700">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        tx.type === 'deposit' ? 'bg-emerald-500/20' : 'bg-orange-500/20'
                      )}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <ArrowUpFromLine className="h-5 w-5 text-orange-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium capitalize">{tx.type}</p>
                        <p className="text-slate-500 text-xs">
                          {format(new Date(tx.createdAt), 'MMM d, yyyy • HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'font-semibold',
                        tx.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                      )}>
                        {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTransaction(null)}
          />
          <div className="relative w-full max-w-lg mx-4 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className={cn(
              'px-6 py-4 border-b border-slate-700',
              selectedTransaction.type === 'deposit' ? 'bg-emerald-900/20' : 'bg-orange-900/20'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    selectedTransaction.type === 'deposit' ? 'bg-emerald-500/20' : 'bg-orange-500/20'
                  )}>
                    {selectedTransaction.type === 'deposit' ? (
                      <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ArrowUpFromLine className="h-5 w-5 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white capitalize">
                      {selectedTransaction.type} Details
                    </h3>
                    <p className="text-slate-400 text-sm">Transaction ID: {selectedTransaction.id.slice(0, 8)}...</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Amount */}
              <div className="text-center py-4 bg-slate-700/50 rounded-xl">
                <p className="text-slate-400 text-sm mb-1">Amount</p>
                <p className={cn(
                  'text-3xl font-bold',
                  selectedTransaction.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                )}>
                  {selectedTransaction.type === 'deposit' ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Status</p>
                  <StatusBadge status={selectedTransaction.status} />
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Method</p>
                  <MethodBadge method={selectedTransaction.method} />
                </div>
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <p className="text-slate-400 text-xs mb-1">Created</p>
                  <p className="text-white text-sm">
                    {format(new Date(selectedTransaction.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                {selectedTransaction.processedAt && (
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-1">Processed</p>
                    <p className="text-white text-sm">
                      {format(new Date(selectedTransaction.processedAt), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              {selectedTransaction.method === 'MOBILE_MONEY' && (
                <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                  {selectedTransaction.mobileProvider && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Provider</span>
                      <span className="text-white">{selectedTransaction.mobileProvider}</span>
                    </div>
                  )}
                  {selectedTransaction.phoneNumber && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone Number</span>
                      <span className="text-white">{selectedTransaction.phoneNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedTransaction.method === 'CRYPTO' && (
                <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                  {selectedTransaction.cryptoCurrency && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Currency</span>
                      <span className="text-white">{selectedTransaction.cryptoCurrency}</span>
                    </div>
                  )}
                  {selectedTransaction.walletAddress && (
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Wallet Address</p>
                      <p className="text-white text-xs font-mono break-all bg-slate-800 p-2 rounded">
                        {selectedTransaction.walletAddress}
                      </p>
                    </div>
                  )}
                  {selectedTransaction.transactionHash && (
                    <div>
                      <p className="text-slate-400 text-sm mb-1">Transaction Hash</p>
                      <p className="text-white text-xs font-mono break-all bg-slate-800 p-2 rounded">
                        {selectedTransaction.transactionHash}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Note */}
              {selectedTransaction.adminNote && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Admin Note</p>
                  <p className="text-white">{selectedTransaction.adminNote}</p>
                </div>
              )}

              <button
                onClick={() => setSelectedTransaction(null)}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
