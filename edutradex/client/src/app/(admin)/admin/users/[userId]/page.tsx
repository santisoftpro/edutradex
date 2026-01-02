'use client';

import { useEffect, useState, useCallback, memo, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Mail,
  Calendar,
  Shield,
  User,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  UserX,
  UserCheck,
  RotateCcw,
  Trash2,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { PasswordConfirmModal } from '@/components/modals/PasswordConfirmModal';
import type { AdminUserDetail } from '@/types';

interface LiveTrade {
  id: string;
  symbol: string;
  direction: string;
  amount: number;
  entryPrice: number;
  duration: number;
  payoutPercent: number;
  accountType: string;
  openedAt: string;
  expiresAt: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  status: string;
  method: string;
  createdAt: string;
  processedAt?: string;
}

interface AccountStats {
  liveBalance: number;
  demoBalance: number;
  activeAccountType: string;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
}

type Tab = 'overview' | 'trades' | 'transactions';

// Memoized skeleton components for loading states
const SkeletonStatCard = memo(function SkeletonStatCard() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-700/50 w-8 h-8" />
        <div>
          <div className="h-3 w-16 bg-slate-700 rounded mb-2" />
          <div className="h-5 w-20 bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
});

const SkeletonUserProfile = memo(function SkeletonUserProfile() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 animate-pulse">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-slate-700 rounded-full" />
          <div>
            <div className="h-6 w-32 bg-slate-700 rounded mb-2" />
            <div className="h-4 w-48 bg-slate-700/50 rounded mb-2" />
            <div className="h-3 w-24 bg-slate-700/30 rounded" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-9 w-24 bg-slate-700 rounded-lg" />
          <div className="h-9 w-24 bg-slate-700 rounded-lg" />
          <div className="h-9 w-28 bg-slate-700 rounded-lg" />
        </div>
      </div>
    </div>
  );
});

// Memoized confirmation dialog
const ConfirmDialog = memo(function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  confirmColor,
  onConfirm,
  onCancel,
  isProcessing,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'emerald';
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-xl">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-slate-400">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2',
              confirmColor === 'red'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [liveTrades, setLiveTrades] = useState<LiveTrade[]>([]);
  const [accountStats, setAccountStats] = useState<AccountStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [transactionType, setTransactionType] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'status' | 'role' | 'balance';
    newValue?: boolean | string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [showImpersonateModal, setShowImpersonateModal] = useState(false);

  const { user: currentUser } = useAuthStore();

  // Memoized fetch for user data with optional loading control
  const fetchUserData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
      setError(null);
    }
    try {
      const data = await api.getAdminUserFullDetail(userId);
      setUser(data.user);
      setIsOnline(data.isOnline);
      setLiveTrades(data.liveTrades);
      setAccountStats(data.accountStats);
    } catch (err) {
      if (showLoading) {
        setError('Failed to load user details');
      }
      console.error(err);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  // Memoized fetch for transactions with loading control
  const fetchTransactions = useCallback(async (page: number = 1, showLoading = true) => {
    if (showLoading) {
      setIsLoadingTransactions(true);
    }
    try {
      const response = await api.getUserTransactions(userId, {
        page,
        limit: 10,
        type: transactionType,
      });
      setTransactions(response.data);
      setTransactionsPagination(response.pagination);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      if (showLoading) {
        toast.error('Failed to load transactions');
      }
    } finally {
      if (showLoading) {
        setIsLoadingTransactions(false);
      }
    }
  }, [userId, transactionType]);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch transactions when tab changes or filter changes
  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions(1);
    }
  }, [activeTab, fetchTransactions]);

  // Silent refresh for live data (online status, live trades) - no loading spinners
  useEffect(() => {
    const interval = setInterval(() => {
      fetchUserData(false); // Silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchUserData]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleImpersonate = async (password: string) => {
    if (!user || !currentUser) return;

    setIsImpersonating(true);
    try {
      const result = await api.impersonateUser(userId, password);

      // Store impersonation data for the new tab (using sessionStorage for security)
      sessionStorage.setItem('impersonation-token', result.token);
      sessionStorage.setItem('impersonation-user', JSON.stringify(result.user));
      sessionStorage.setItem('impersonation-admin-id', currentUser.id);

      // Open dashboard in new tab
      const newTab = window.open('/dashboard?impersonate=true', '_blank');

      if (!newTab) {
        toast.error('Please allow popups to login as user');
        // Clean up stored data
        sessionStorage.removeItem('impersonation-token');
        sessionStorage.removeItem('impersonation-user');
        sessionStorage.removeItem('impersonation-admin-id');
      } else {
        toast.success(`Opened ${result.user.name}'s account in new tab`);
        setShowImpersonateModal(false);
      }
    } catch (error: any) {
      // Re-throw to let the modal handle the error display
      throw error;
    } finally {
      setIsImpersonating(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction || !user) return;

    setIsProcessing(true);
    try {
      switch (confirmAction.type) {
        case 'delete':
          await api.deleteUser(userId);
          toast.success('User deleted successfully');
          router.push('/admin/users');
          return;
        case 'status':
          await api.updateUserStatus(userId, confirmAction.newValue as boolean);
          toast.success(`User ${confirmAction.newValue ? 'activated' : 'deactivated'} successfully`);
          break;
        case 'role':
          await api.updateUserRole(userId, confirmAction.newValue as 'USER' | 'ADMIN');
          toast.success('User role updated successfully');
          break;
        case 'balance':
          await api.resetUserBalance(userId);
          toast.success('User balance reset successfully');
          break;
      }
      fetchUserData();
    } catch {
      toast.error('Action failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction || !user) return null;

    switch (confirmAction.type) {
      case 'delete':
        return {
          title: 'Delete User',
          message: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
          confirmText: 'Delete',
          confirmColor: 'red' as const,
        };
      case 'status':
        return {
          title: confirmAction.newValue ? 'Activate User' : 'Deactivate User',
          message: `Are you sure you want to ${confirmAction.newValue ? 'activate' : 'deactivate'} ${user.name}?`,
          confirmText: confirmAction.newValue ? 'Activate' : 'Deactivate',
          confirmColor: confirmAction.newValue ? 'emerald' as const : 'red' as const,
        };
      case 'role':
        return {
          title: 'Change User Role',
          message: `Are you sure you want to change ${user.name}'s role to ${confirmAction.newValue}?`,
          confirmText: 'Change Role',
          confirmColor: 'emerald' as const,
        };
      case 'balance':
        return {
          title: 'Reset Balance',
          message: `Are you sure you want to reset ${user.name}'s balance to the default amount?`,
          confirmText: 'Reset',
          confirmColor: 'emerald' as const,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 w-9 h-9 bg-slate-700 rounded-lg animate-pulse" />
            <div>
              <div className="h-6 w-32 bg-slate-700 rounded mb-2 animate-pulse" />
              <div className="h-4 w-48 bg-slate-700/50 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Profile Skeleton */}
        <SkeletonUserProfile />

        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error || 'User not found'}</p>
          <button
            onClick={() => router.push('/admin/users')}
            className="mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/users')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">User Details</h1>
            <p className="text-sm text-slate-400">View and manage user account</p>
          </div>
        </div>
        <button
          onClick={() => fetchUserData()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* User Profile Card */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-slate-800',
                  isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    user.role === 'ADMIN'
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {user.role}
                </span>
                {isOnline ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {user.email}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-slate-500">ID:</span>
                <span className="text-xs text-slate-400 font-mono">{user.id}</span>
                <button
                  onClick={() => copyToClipboard(user.id, 'id')}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  {copiedField === 'id' ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-500" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Login as User - Only for regular users, not admins/superadmins */}
            {user.role === 'USER' && (
              <button
                onClick={() => setShowImpersonateModal(true)}
                disabled={isImpersonating}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 rounded-lg text-sm text-amber-400 transition-colors disabled:opacity-50"
              >
                {isImpersonating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                Login as User
              </button>
            )}
            <button
              onClick={() =>
                setConfirmAction({
                  type: 'status',
                  newValue: !user.isActive,
                })
              }
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                user.isActive
                  ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400'
                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
              )}
            >
              {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              {user.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() =>
                setConfirmAction({
                  type: 'role',
                  newValue: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
                })
              }
              className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg text-sm text-purple-400 transition-colors"
            >
              {user.role === 'ADMIN' ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              {user.role === 'ADMIN' ? 'Demote' : 'Promote'}
            </button>
            <button
              onClick={() => setConfirmAction({ type: 'balance' })}
              className="flex items-center gap-2 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 rounded-lg text-sm text-cyan-400 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Balance
            </button>
            {user.role !== 'ADMIN' && (
              <button
                onClick={() => setConfirmAction({ type: 'delete' })}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 rounded-lg text-sm text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Live Balance</p>
              <p className="text-lg font-bold text-white">{formatCurrency(accountStats?.demoBalance || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Trades</p>
              <p className="text-lg font-bold text-white">{user.stats?.totalTrades || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Percent className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Win Rate</p>
              <p className="text-lg font-bold text-white">{user.stats?.winRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <ArrowUpRight className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Deposits</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(accountStats?.totalDeposits || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <ArrowDownRight className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Withdrawals</p>
              <p className="text-lg font-bold text-orange-400">{formatCurrency(accountStats?.totalWithdrawals || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="h-4 w-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending Deposits</p>
              <p className="text-lg font-bold text-white">{accountStats?.pendingDeposits || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Clock className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending Withdrawals</p>
              <p className="text-lg font-bold text-white">{accountStats?.pendingWithdrawals || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700/50 pb-2">
        {(['overview', 'trades', 'transactions'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-gradient-to-r from-[#1079ff] to-[#092ab2] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Live Trades */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Live Trades</h3>
              </div>
              <span className="text-xs text-slate-400">{liveTrades.length} open</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {liveTrades.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No active trades</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {liveTrades.map((trade) => (
                    <div key={trade.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-1.5 rounded-lg',
                            trade.direction === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          )}>
                            {trade.direction === 'UP' ? (
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{trade.symbol}</p>
                            <p className="text-xs text-slate-400">
                              Entry: {trade.entryPrice.toFixed(5)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-medium">{formatCurrency(trade.amount)}</p>
                          <p className="text-xs text-slate-400">{trade.accountType}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Recent Trades</h3>
              </div>
              <span className="text-xs text-slate-400">Last 10</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {(!user.recentTrades || user.recentTrades.length === 0) ? (
                <div className="py-8 text-center text-slate-400 text-sm">No recent trades</div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {user.recentTrades.map((trade) => (
                    <div key={trade.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-1.5 rounded-lg',
                            trade.direction === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          )}>
                            {trade.direction === 'UP' ? (
                              <TrendingUp className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-white font-medium">{trade.symbol}</p>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 text-[10px] rounded',
                                  trade.status === 'OPEN'
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : trade.profit && trade.profit > 0
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                                )}
                              >
                                {trade.status === 'OPEN' ? 'OPEN' : trade.profit && trade.profit > 0 ? 'WON' : 'LOST'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400" suppressHydrationWarning>
                              {formatDate(trade.openedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-medium">{formatCurrency(trade.amount)}</p>
                          {trade.profit !== null && (
                            <p className={cn(
                              'text-xs font-medium',
                              trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                            )}>
                              {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h3 className="text-sm font-semibold text-white">Trade History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Symbol</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {(!user.recentTrades || user.recentTrades.length === 0) ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No trades found
                    </td>
                  </tr>
                ) : (
                  user.recentTrades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-white font-medium">{trade.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'flex items-center gap-1 text-sm',
                          trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {trade.direction === 'UP' ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{formatCurrency(trade.amount)}</td>
                      <td className="px-4 py-3">
                        {trade.profit !== null ? (
                          <span className={cn(
                            'text-sm font-medium',
                            trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                          )}>
                            {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          trade.status === 'OPEN'
                            ? 'bg-amber-500/20 text-amber-400'
                            : trade.profit && trade.profit > 0
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        )}>
                          {trade.status === 'OPEN' ? 'OPEN' : trade.profit && trade.profit > 0 ? 'WON' : 'LOST'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400" suppressHydrationWarning>
                        {formatDate(trade.openedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(['all', 'deposit', 'withdrawal'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTransactionType(type)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  transactionType === type
                    ? 'bg-gradient-to-r from-[#1079ff] to-[#092ab2] text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {isLoadingTransactions ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center">
                        <Loader2 className="h-6 w-6 text-[#1079ff] animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={cn(
                            'flex items-center gap-1.5 text-sm font-medium',
                            tx.type === 'deposit' ? 'text-emerald-400' : 'text-orange-400'
                          )}>
                            {tx.type === 'deposit' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-medium">
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">
                          {tx.method === 'MOBILE_MONEY' ? 'Mobile Money' : tx.method === 'CRYPTO' ? 'Crypto' : tx.method}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            tx.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          )}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400" suppressHydrationWarning>
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {transactionsPagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Page {transactionsPagination.page} of {transactionsPagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchTransactions(transactionsPagination.page - 1)}
                    disabled={transactionsPagination.page === 1 || isLoadingTransactions}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => fetchTransactions(transactionsPagination.page + 1)}
                    disabled={transactionsPagination.page === transactionsPagination.totalPages || isLoadingTransactions}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          {...getConfirmDialogProps()!}
          onConfirm={handleAction}
          onCancel={() => setConfirmAction(null)}
          isProcessing={isProcessing}
        />
      )}

      {/* Password confirmation modal for impersonation */}
      {user && (
        <PasswordConfirmModal
          isOpen={showImpersonateModal}
          title="Login as User"
          description={`You will be logged in as ${user.name} (${user.email}). All actions will be performed as this user. Enter your password to confirm.`}
          confirmText="Login as User"
          confirmColor="amber"
          onConfirm={handleImpersonate}
          onCancel={() => setShowImpersonateModal(false)}
        />
      )}
    </div>
  );
}
