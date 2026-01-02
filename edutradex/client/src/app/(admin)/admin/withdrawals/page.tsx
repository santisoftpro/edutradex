'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Search,
  Eye,
  Copy,
  Check,
  X,
  RefreshCw,
  ArrowDownRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Withdrawal, WithdrawalStatus, WithdrawalMethod, WithdrawalStats } from '@/types';

type DateRange = 'all' | 'today' | '7days' | '30days';

function WithdrawalDetailModal({
  withdrawal,
  onClose,
}: {
  withdrawal: Withdrawal;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const DetailRow = ({
    label,
    value,
    copyable = false,
    mono = false,
  }: {
    label: string;
    value: string;
    copyable?: boolean;
    mono?: boolean;
  }) => (
    <div className="flex items-start justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-white text-sm text-right', mono && 'font-mono', copyable && 'max-w-[200px] truncate')}>
          {value}
        </span>
        {copyable && (
          <button
            onClick={() => copyToClipboard(value, label)}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            {copiedField === label ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  const getStatusBadge = (status: WithdrawalStatus) => {
    const styles = {
      PENDING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const icons = {
      PENDING: <Clock className="h-3.5 w-3.5" />,
      APPROVED: <CheckCircle className="h-3.5 w-3.5" />,
      REJECTED: <XCircle className="h-3.5 w-3.5" />,
    };
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', styles[status])}>
        {icons[status]}
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <ArrowDownRight className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Withdrawal Details</h3>
              <p className="text-xs text-slate-400">ID: {withdrawal.id.slice(0, 8)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="text-center py-4 bg-slate-900/50 rounded-xl">
            <p className="text-sm text-slate-400 mb-1">Amount</p>
            <p className="text-3xl font-bold text-orange-400">{formatCurrency(withdrawal.amount)}</p>
            <div className="mt-2">{getStatusBadge(withdrawal.status)}</div>
          </div>

          <div className="space-y-1 bg-slate-900/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">User Info</h4>
            <DetailRow label="Name" value={withdrawal.user?.name || 'Unknown'} />
            <DetailRow label="Email" value={withdrawal.user?.email || 'N/A'} copyable />
            <DetailRow label="User ID" value={withdrawal.userId} copyable mono />
          </div>

          <div className="space-y-1 bg-slate-900/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Payment Details</h4>
            <DetailRow label="Method" value={withdrawal.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cryptocurrency'} />
            {withdrawal.method === 'MOBILE_MONEY' ? (
              <>
                <DetailRow label="Provider" value={withdrawal.mobileProvider || 'N/A'} />
                <DetailRow label="Phone" value={withdrawal.phoneNumber || 'N/A'} copyable />
              </>
            ) : (
              <>
                <DetailRow label="Currency" value={withdrawal.cryptoCurrency || 'N/A'} />
                {withdrawal.network && <DetailRow label="Network" value={withdrawal.network} />}
                <DetailRow label="Wallet" value={withdrawal.walletAddress || 'N/A'} copyable mono />
              </>
            )}
          </div>

          <div className="space-y-1 bg-slate-900/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Transaction Info</h4>
            <DetailRow label="Transaction ID" value={withdrawal.id} copyable mono />
            <DetailRow label="Created" value={formatDate(withdrawal.createdAt)} />
            {withdrawal.processedAt && <DetailRow label="Processed" value={formatDate(withdrawal.processedAt)} />}
            {withdrawal.adminNote && (
              <div className="pt-2 mt-2 border-t border-slate-700/50">
                <p className="text-xs text-slate-500 mb-1">Admin Note</p>
                <p className="text-sm text-slate-300">{withdrawal.adminNote}</p>
              </div>
            )}
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-xl">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            {action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Amount</span>
              <span className="text-white font-semibold">{formatCurrency(withdrawal.amount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">Method</span>
              <span className="text-white">
                {withdrawal.method === 'MOBILE_MONEY'
                  ? withdrawal.mobileProvider
                  : `${withdrawal.cryptoCurrency}${withdrawal.network ? ` (${withdrawal.network})` : ''}`}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-sm">User</span>
              <span className="text-white">{withdrawal.user?.name || withdrawal.userId}</span>
            </div>
            {withdrawal.method === 'MOBILE_MONEY' && withdrawal.phoneNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Phone</span>
                <span className="text-white font-mono text-sm">{withdrawal.phoneNumber}</span>
              </div>
            )}
            {withdrawal.method === 'CRYPTO' && withdrawal.walletAddress && (
              <div className="pt-2 border-t border-slate-700/50">
                <span className="text-slate-400 text-sm block mb-1">Wallet Address</span>
                <span className="text-white text-xs font-mono break-all">{withdrawal.walletAddress}</span>
                {withdrawal.network && (
                  <p className="text-emerald-400 text-xs mt-1">Network: {withdrawal.network}</p>
                )}
              </div>
            )}
          </div>

          {action === 'approve' ? (
            <div className="p-3 bg-emerald-900/30 border border-emerald-900/50 rounded-lg">
              <p className="text-sm text-emerald-400">
                {formatCurrency(withdrawal.amount)} was already deducted from user&apos;s balance.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-900/30 border border-amber-900/50 rounded-lg">
              <p className="text-sm text-amber-400">
                Rejecting will refund {formatCurrency(withdrawal.amount)} to user&apos;s balance.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Admin Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === 'reject' ? 'Reason for rejection...' : 'Add a note...'}
              rows={3}
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:border-transparent resize-none text-sm"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-700 flex gap-3 justify-end">
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
  const [isProcessing, setIsProcessing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<WithdrawalMethod | ''>('');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
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

  const getDateCutoff = (range: DateRange): Date | null => {
    const now = new Date();
    switch (range) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case '7days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30days':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const filteredWithdrawals = useMemo(() => {
    let result = withdrawals;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (w) =>
          w.id.toLowerCase().includes(query) ||
          w.user?.name?.toLowerCase().includes(query) ||
          w.user?.email?.toLowerCase().includes(query) ||
          w.phoneNumber?.toLowerCase().includes(query) ||
          w.walletAddress?.toLowerCase().includes(query)
      );
    }

    const cutoff = getDateCutoff(dateRange);
    if (cutoff) {
      result = result.filter((w) => new Date(w.createdAt) >= cutoff);
    }

    return result;
  }, [withdrawals, searchQuery, dateRange]);

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

  const handleRefresh = () => {
    fetchWithdrawals();
    fetchStats();
    toast.success('Data refreshed');
  };

  const getStatusBadge = (status: WithdrawalStatus) => {
    const styles = {
      PENDING: 'bg-amber-500/20 text-amber-400',
      APPROVED: 'bg-emerald-500/20 text-emerald-400',
      REJECTED: 'bg-red-500/20 text-red-400',
    };
    const icons = {
      PENDING: <Clock className="h-3.5 w-3.5" />,
      APPROVED: <CheckCircle className="h-3.5 w-3.5" />,
      REJECTED: <XCircle className="h-3.5 w-3.5" />,
    };
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', styles[status])}>
        {icons[status]}
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Withdrawal Management</h1>
          <p className="text-sm text-slate-400">Review and process withdrawal requests</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending</p>
              <p className="text-lg font-bold text-white">{stats?.pending ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Approved</p>
              <p className="text-lg font-bold text-white">{stats?.approved ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Rejected</p>
              <p className="text-lg font-bold text-white">{stats?.rejected ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1079ff]/20">
              <DollarSign className="h-4 w-4 text-[#1079ff]" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Withdrawn</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats?.totalVolume ?? 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, user, phone, wallet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:border-transparent text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as WithdrawalStatus | '');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value as WithdrawalMethod | '');
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            >
              <option value="">All Methods</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CRYPTO">Crypto</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No withdrawals found
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-white font-medium">{withdrawal.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{withdrawal.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold">{formatCurrency(withdrawal.amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {withdrawal.method === 'MOBILE_MONEY' ? (
                          <Smartphone className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Bitcoin className="h-4 w-4 text-orange-400" />
                        )}
                        <span className="text-sm text-white">
                          {withdrawal.method === 'MOBILE_MONEY' ? 'Mobile' : 'Crypto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {withdrawal.method === 'MOBILE_MONEY' ? (
                          <>
                            <p className="text-white">{withdrawal.mobileProvider}</p>
                            <p className="text-slate-400">{withdrawal.phoneNumber}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-white">
                              {withdrawal.cryptoCurrency}
                              {withdrawal.network && (
                                <span className="text-emerald-400 ml-1">({withdrawal.network})</span>
                              )}
                            </p>
                            <p className="text-slate-400 truncate max-w-[150px]" title={withdrawal.walletAddress}>
                              {withdrawal.walletAddress}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(withdrawal.status)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400" suppressHydrationWarning>
                      {formatDate(withdrawal.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {withdrawal.status === 'PENDING' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-white">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No withdrawals found</div>
        ) : (
          filteredWithdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    withdrawal.method === 'MOBILE_MONEY' ? 'bg-blue-500/20' : 'bg-orange-500/20'
                  )}>
                    {withdrawal.method === 'MOBILE_MONEY' ? (
                      <Smartphone className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Bitcoin className="h-4 w-4 text-orange-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{withdrawal.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{withdrawal.user?.email}</p>
                  </div>
                </div>
                {getStatusBadge(withdrawal.status)}
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Amount</span>
                  <span className="text-white font-semibold">{formatCurrency(withdrawal.amount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Method</span>
                  <span className="text-white text-sm">
                    {withdrawal.method === 'MOBILE_MONEY'
                      ? `${withdrawal.mobileProvider} - ${withdrawal.phoneNumber}`
                      : `${withdrawal.cryptoCurrency}${withdrawal.network ? ` (${withdrawal.network})` : ''}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Date</span>
                  <span className="text-slate-300 text-xs" suppressHydrationWarning>
                    {formatDate(withdrawal.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                <button
                  onClick={() => setSelectedWithdrawal(withdrawal)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  Details
                </button>
                {withdrawal.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setProcessingWithdrawal({ withdrawal, action: 'approve' })}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 rounded-lg text-sm text-emerald-400 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setProcessingWithdrawal({ withdrawal, action: 'reject' })}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-sm text-red-400 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              disabled={pagination.page === 1}
              className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-sm text-white">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedWithdrawal && (
        <WithdrawalDetailModal
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
        />
      )}

      {/* Process Modal */}
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
