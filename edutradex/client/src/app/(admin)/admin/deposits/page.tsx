'use client';

import { useEffect, useState, useCallback } from 'react';
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
  RefreshCw,
  Eye,
  X,
  Copy,
  Check,
  User,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';
import type { Deposit, DepositStatus, DepositMethod, DepositStats } from '@/types';

type DateRangeType = 'all' | 'today' | '7d' | '30d';

function StatusBadge({ status }: { status: DepositStatus }) {
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

function ProcessDepositModal({
  deposit,
  action,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  deposit: Deposit;
  action: 'approve' | 'reject';
  onConfirm: (note: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
        <div className={cn(
          'p-4 border-b border-slate-700',
          action === 'approve' ? 'bg-emerald-900/20' : 'bg-red-900/20'
        )}>
          <h3 className="text-lg font-semibold text-white">
            {action === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
          </h3>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-3 bg-slate-900 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Amount:</span>
              <span className="text-white font-medium">{formatCurrency(deposit.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Method:</span>
              <span className="text-white">
                {deposit.method === 'MOBILE_MONEY' ? deposit.mobileProvider : deposit.cryptoCurrency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">User:</span>
              <span className="text-white">{deposit.user?.name || deposit.userId}</span>
            </div>
          </div>

          {action === 'approve' && (
            <div className="p-3 bg-emerald-900/30 border border-emerald-900/50 rounded-lg">
              <p className="text-sm text-emerald-400">
                Approving will add {formatCurrency(deposit.amount)} to the user&apos;s balance.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Admin Note {action === 'reject' ? '(recommended)' : '(optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === 'reject' ? 'Reason for rejection...' : 'Add a note...'}
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none text-sm"
            />
          </div>

          <div className="flex gap-3 justify-end">
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
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              )}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              {action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DepositDetailModal({
  deposit,
  onClose,
  onApprove,
  onReject,
}: {
  deposit: Deposit;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
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
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-emerald-900/20 flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Deposit Details</h3>
              <p className="text-slate-400 text-xs">ID: {deposit.id.slice(0, 8)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Amount */}
          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg">
            <span className="text-slate-400 text-sm">Amount</span>
            <span className="text-emerald-400 font-bold text-xl">+{formatCurrency(deposit.amount)}</span>
          </div>

          {/* Transaction ID */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs">Transaction ID</span>
              <button
                onClick={() => copyToClipboard(deposit.id, 'ID')}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                {copied === 'ID' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
              </button>
            </div>
            <p className="text-white text-xs font-mono break-all">{deposit.id}</p>
          </div>

          {/* User Info */}
          <div className="p-3 bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-slate-400" />
              <span className="text-slate-400 text-xs">User</span>
            </div>
            <p className="text-white text-sm font-medium">{deposit.user?.name || 'Unknown'}</p>
            <p className="text-slate-400 text-xs">{deposit.user?.email || '-'}</p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <DetailRow label="Status" value={<StatusBadge status={deposit.status} />} />
            <DetailRow label="Method" value={deposit.method === 'MOBILE_MONEY' ? 'Mobile Money' : 'Cryptocurrency'} />
            {deposit.method === 'MOBILE_MONEY' ? (
              <>
                <DetailRow label="Provider" value={deposit.mobileProvider || '-'} />
                <DetailRow label="Phone" value={deposit.phoneNumber || '-'} />
              </>
            ) : (
              <>
                <DetailRow label="Currency" value={deposit.cryptoCurrency || '-'} />
                {deposit.walletAddress && (
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Wallet Address</p>
                    <p className="text-white text-xs font-mono bg-slate-900 p-2 rounded-lg break-all">
                      {deposit.walletAddress}
                    </p>
                  </div>
                )}
              </>
            )}
            <DetailRow label="Created" value={format(new Date(deposit.createdAt), 'MMM d, yyyy HH:mm')} />
            {deposit.processedAt && (
              <DetailRow label="Processed" value={format(new Date(deposit.processedAt), 'MMM d, yyyy HH:mm')} />
            )}
          </div>

          {deposit.adminNote && (
            <div className="p-3 bg-slate-900 rounded-lg">
              <p className="text-slate-400 text-xs mb-1">Admin Note</p>
              <p className="text-white text-sm">{deposit.adminNote}</p>
            </div>
          )}

          {/* Actions */}
          {deposit.status === 'PENDING' && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={onApprove}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={onReject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          )}
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

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [stats, setStats] = useState<DepositStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<DepositStatus | ''>('');
  const [methodFilter, setMethodFilter] = useState<DepositMethod | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [processingDeposit, setProcessingDeposit] = useState<{
    deposit: Deposit;
    action: 'approve' | 'reject';
  } | null>(null);

  const fetchDeposits = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await api.getAdminDeposits({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      setDeposits(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch deposits:', error);
      toast.error('Failed to fetch deposits');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, methodFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getDepositStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchDeposits();
    fetchStats();
  }, [fetchDeposits, fetchStats]);

  const handleProcess = async (note: string) => {
    if (!processingDeposit) return;

    setIsProcessing(true);
    try {
      if (processingDeposit.action === 'approve') {
        await api.approveDeposit(processingDeposit.deposit.id, note || undefined);
        toast.success('Deposit approved successfully');
      } else {
        await api.rejectDeposit(processingDeposit.deposit.id, note || undefined);
        toast.success('Deposit rejected');
      }
      setProcessingDeposit(null);
      setSelectedDeposit(null);
      fetchDeposits();
      fetchStats();
    } catch (error) {
      toast.error('Failed to process deposit');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter deposits by search
  const filteredDeposits = deposits.filter(d => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(query) ||
      d.user?.name?.toLowerCase().includes(query) ||
      d.user?.email?.toLowerCase().includes(query) ||
      d.phoneNumber?.toLowerCase().includes(query)
    );
  });

  const statusOptions: { value: DepositStatus | ''; label: string }[] = [
    { value: '', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
  ];

  const methodOptions: { value: DepositMethod | ''; label: string }[] = [
    { value: '', label: 'All Methods' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
    { value: 'CRYPTO', label: 'Crypto' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-white">Deposits</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Manage deposit requests</p>
        </div>
        <button
          onClick={() => fetchDeposits(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Pending</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{stats?.pending ?? 0}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Approved</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{stats?.approved ?? 0}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-red-500/20 rounded-lg">
              <XCircle className="h-3.5 w-3.5 text-red-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Rejected</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{stats?.rejected ?? 0}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-500/20 rounded-lg">
              <DollarSign className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <span className="text-slate-400 text-[10px] sm:text-xs">Volume</span>
          </div>
          <p className="text-white text-sm sm:text-base font-bold">{formatCurrency(stats?.totalVolume ?? 0)}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, name, email, phone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as DepositStatus | '');
            setPagination(p => ({ ...p, page: 1 }));
          }}
          className="bg-slate-800/50 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value as DepositMethod | '');
            setPagination(p => ({ ...p, page: 1 }));
          }}
          className="bg-slate-800/50 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {methodOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Deposits List */}
      {isLoading ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredDeposits.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 sm:p-12 text-center">
          <DollarSign className="h-12 w-12 sm:h-16 sm:w-16 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-4 text-sm sm:text-base">No deposits found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredDeposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{deposit.user?.name || 'Unknown'}</p>
                        <p className="text-slate-500 text-xs">{deposit.user?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-semibold text-sm">
                        +{formatCurrency(deposit.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {deposit.method === 'MOBILE_MONEY' ? (
                          <Smartphone className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Bitcoin className="h-4 w-4 text-amber-400" />
                        )}
                        <span className="text-white text-sm">
                          {deposit.method === 'MOBILE_MONEY' ? 'Mobile' : 'Crypto'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="text-white">
                          {deposit.method === 'MOBILE_MONEY' ? deposit.mobileProvider : deposit.cryptoCurrency}
                        </p>
                        <p className="text-slate-500 text-xs truncate max-w-[120px]">
                          {deposit.method === 'MOBILE_MONEY' ? deposit.phoneNumber : deposit.walletAddress}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={deposit.status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">{format(new Date(deposit.createdAt), 'MMM d, yyyy')}</p>
                      <p className="text-slate-500 text-xs">{format(new Date(deposit.createdAt), 'HH:mm')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedDeposit(deposit)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {deposit.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => setProcessingDeposit({ deposit, action: 'approve' })}
                              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setProcessingDeposit({ deposit, action: 'reject' })}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-2">
            {filteredDeposits.map((deposit) => (
              <button
                key={deposit.id}
                onClick={() => setSelectedDeposit(deposit)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-left hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      {deposit.method === 'MOBILE_MONEY' ? (
                        <Smartphone className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Bitcoin className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{deposit.user?.name || 'Unknown'}</p>
                      <p className="text-slate-500 text-[10px]">{deposit.user?.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={deposit.status} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                  <span className="text-slate-500 text-[10px]">
                    {format(new Date(deposit.createdAt), 'MMM d, yyyy • HH:mm')}
                  </span>
                  <span className="text-emerald-400 font-bold text-sm">
                    +{formatCurrency(deposit.amount)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs sm:text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedDeposit && !processingDeposit && (
        <DepositDetailModal
          deposit={selectedDeposit}
          onClose={() => setSelectedDeposit(null)}
          onApprove={() => setProcessingDeposit({ deposit: selectedDeposit, action: 'approve' })}
          onReject={() => setProcessingDeposit({ deposit: selectedDeposit, action: 'reject' })}
        />
      )}

      {/* Process Modal */}
      {processingDeposit && (
        <ProcessDepositModal
          deposit={processingDeposit.deposit}
          action={processingDeposit.action}
          onConfirm={handleProcess}
          onCancel={() => setProcessingDeposit(null)}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
