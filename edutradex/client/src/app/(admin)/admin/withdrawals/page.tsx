'use client';

import { useEffect, useState } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Withdrawal, WithdrawalStatus, WithdrawalMethod, WithdrawalStats } from '@/types';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-600/20 text-amber-500',
    emerald: 'bg-emerald-600/20 text-emerald-500',
    red: 'bg-red-600/20 text-red-500',
    purple: 'bg-purple-600/20 text-purple-500',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProcessWithdrawalModal({
  withdrawal,
  action,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  withdrawal: Withdrawal;
  action: 'approve' | 'reject';
  onConfirm: (note: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">
          {action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
        </h3>
        <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Amount:</span>
            <span className="text-white font-medium">{formatCurrency(withdrawal.amount)}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-slate-400">Method:</span>
            <span className="text-white">
              {withdrawal.method === 'MOBILE_MONEY' ? withdrawal.mobileProvider : withdrawal.cryptoCurrency}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-slate-400">User:</span>
            <span className="text-white">{withdrawal.user?.name || withdrawal.userId}</span>
          </div>
          {withdrawal.method === 'MOBILE_MONEY' && withdrawal.phoneNumber && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-slate-400">Phone:</span>
              <span className="text-white">{withdrawal.phoneNumber}</span>
            </div>
          )}
          {withdrawal.method === 'CRYPTO' && withdrawal.walletAddress && (
            <div className="mt-2">
              <span className="text-slate-400 block">Wallet:</span>
              <span className="text-white text-sm font-mono break-all">{withdrawal.walletAddress}</span>
            </div>
          )}
        </div>

        {action === 'approve' && (
          <div className="mt-4 p-3 bg-emerald-900/30 border border-emerald-900/50 rounded-lg">
            <p className="text-sm text-emerald-400">
              {formatCurrency(withdrawal.amount)} was already deducted from user&apos;s balance when requested.
            </p>
          </div>
        )}

        {action === 'reject' && (
          <div className="mt-4 p-3 bg-amber-900/30 border border-amber-900/50 rounded-lg">
            <p className="text-sm text-amber-400">
              Rejecting will refund {formatCurrency(withdrawal.amount)} back to user&apos;s balance.
            </p>
          </div>
        )}

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-400 mb-1">
            Admin Note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={action === 'reject' ? 'Reason for rejection...' : 'Add a note...'}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            disabled={isProcessing}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              action === 'approve'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            )}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<WithdrawalMethod | ''>('');

  const [processingWithdrawal, setProcessingWithdrawal] = useState<{
    withdrawal: Withdrawal;
    action: 'approve' | 'reject';
  } | null>(null);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAdminWithdrawals({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      setWithdrawals(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
      toast.error('Failed to fetch withdrawals');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getWithdrawalStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
    fetchStats();
  }, [pagination.page, statusFilter, methodFilter]);

  const handleProcess = async (note: string) => {
    if (!processingWithdrawal) return;

    setIsProcessing(true);
    try {
      if (processingWithdrawal.action === 'approve') {
        await api.approveWithdrawal(processingWithdrawal.withdrawal.id, note || undefined);
        toast.success('Withdrawal approved successfully');
      } else {
        await api.rejectWithdrawal(processingWithdrawal.withdrawal.id, note || undefined);
        toast.success('Withdrawal rejected');
      }
      setProcessingWithdrawal(null);
      fetchWithdrawals();
      fetchStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process withdrawal';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: WithdrawalStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-400" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-emerald-400" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: WithdrawalStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-900/50 text-amber-400';
      case 'APPROVED':
        return 'bg-emerald-900/50 text-emerald-400';
      case 'REJECTED':
        return 'bg-red-900/50 text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Withdrawal Management</h1>
        <p className="text-slate-400 mt-1">Review and process user withdrawal requests</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending" value={stats?.pending ?? 0} icon={Clock} color="amber" />
        <StatCard title="Approved" value={stats?.approved ?? 0} icon={CheckCircle} color="emerald" />
        <StatCard title="Rejected" value={stats?.rejected ?? 0} icon={XCircle} color="red" />
        <StatCard
          title="Total Withdrawn"
          value={formatCurrency(stats?.totalVolume ?? 0)}
          icon={DollarSign}
          color="purple"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
            showFilters
              ? 'bg-purple-600 border-purple-600 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          )}
        >
          <Filter className="h-5 w-5" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as WithdrawalStatus | '');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Method</label>
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value as WithdrawalMethod | '');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Methods</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="CRYPTO">Cryptocurrency</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Method</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Details</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Date</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No withdrawals found
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{withdrawal.user?.name || 'Unknown'}</p>
                        <p className="text-sm text-slate-400">{withdrawal.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">
                        {formatCurrency(withdrawal.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {withdrawal.method === 'MOBILE_MONEY' ? (
                          <Smartphone className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Bitcoin className="h-4 w-4 text-orange-400" />
                        )}
                        <span className="text-white">
                          {withdrawal.method === 'MOBILE_MONEY' ? 'Mobile' : 'Crypto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {withdrawal.method === 'MOBILE_MONEY' ? (
                          <>
                            <p className="text-white">{withdrawal.mobileProvider}</p>
                            <p className="text-slate-400">{withdrawal.phoneNumber}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-white">{withdrawal.cryptoCurrency}</p>
                            <p className="text-slate-400 truncate max-w-[150px]" title={withdrawal.walletAddress}>
                              {withdrawal.walletAddress}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                          getStatusColor(withdrawal.status)
                        )}
                      >
                        {getStatusIcon(withdrawal.status)}
                        {withdrawal.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(withdrawal.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {withdrawal.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setProcessingWithdrawal({ withdrawal, action: 'approve' })}
                            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setProcessingWithdrawal({ withdrawal, action: 'reject' })}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          {withdrawal.adminNote && (
                            <span
                              className="text-slate-400 text-xs cursor-help"
                              title={withdrawal.adminNote}
                            >
                              <AlertCircle className="h-4 w-4 inline" />
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
              withdrawals
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {processingWithdrawal && (
        <ProcessWithdrawalModal
          withdrawal={processingWithdrawal.withdrawal}
          action={processingWithdrawal.action}
          onConfirm={handleProcess}
          onCancel={() => setProcessingWithdrawal(null)}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
