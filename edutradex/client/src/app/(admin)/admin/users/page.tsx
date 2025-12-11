'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserX,
  UserCheck,
  Shield,
  User,
  Loader2,
  AlertCircle,
  RotateCcw,
  Trash2,
  RefreshCw,
  Users,
  Wifi,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '@/store/admin.store';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { AdminUser } from '@/types';

interface OnlineUser {
  id: string;
  name: string;
  email: string;
  connectionCount: number;
  liveBalance: number;
  demoBalance: number;
  activeAccountType: string;
}

interface RecentTrade {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  symbol: string;
  direction: string;
  amount: number;
  profit: number | null;
  status: string;
  result: string | null;
  accountType: string;
  openedAt: string;
  closedAt: string | null;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmColor: 'red' | 'emerald';
  onConfirm: () => void;
  onCancel: () => void;
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
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              confirmColor === 'red'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const {
    users,
    usersPagination,
    usersFilter,
    isLoading,
    error,
    fetchUsers,
    setUsersFilter,
    updateUserStatus,
    updateUserRole,
    resetUserBalance,
    deleteUser,
    clearError,
  } = useAdminStore();

  const [searchInput, setSearchInput] = useState(usersFilter.search);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'status' | 'role' | 'balance';
    user: AdminUser;
    newValue?: boolean | string;
  } | null>(null);

  // New states for online users and recent trades
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(true);

  // Create a set of online user IDs for quick lookup
  const onlineUserIds = useMemo(() => new Set(onlineUsers.map(u => u.id)), [onlineUsers]);

  const fetchExtraData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingExtra(true);
    try {
      const [onlineData, tradesData] = await Promise.all([
        api.getOnlineUsers(),
        api.getRecentPlatformTrades(10),
      ]);
      setOnlineUsers(onlineData.users);
      setOnlineCount(onlineData.count);
      setRecentTrades(tradesData);
    } catch (error) {
      console.error('Failed to fetch extra data:', error);
    } finally {
      if (showLoading) setIsLoadingExtra(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
    fetchExtraData();
  }, [fetchUsers]);

  // Refetch when filter changes
  useEffect(() => {
    fetchUsers();
  }, [usersFilter, fetchUsers]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchInput !== usersFilter.search) {
        setUsersFilter({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchInput, usersFilter.search, setUsersFilter]);

  // Refresh online data periodically (silent refresh)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchExtraData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchExtraData]);

  const handleRefresh = () => {
    fetchUsers();
    fetchExtraData();
    toast.success('Data refreshed');
  };

  const handleAction = async () => {
    if (!confirmAction) return;

    try {
      switch (confirmAction.type) {
        case 'delete':
          await deleteUser(confirmAction.user.id);
          toast.success('User deleted successfully');
          break;
        case 'status':
          await updateUserStatus(confirmAction.user.id, confirmAction.newValue as boolean);
          toast.success(`User ${confirmAction.newValue ? 'activated' : 'deactivated'} successfully`);
          break;
        case 'role':
          await updateUserRole(confirmAction.user.id, confirmAction.newValue as 'USER' | 'ADMIN');
          toast.success('User role updated successfully');
          break;
        case 'balance':
          await resetUserBalance(confirmAction.user.id);
          toast.success('User balance reset successfully');
          break;
      }
    } catch {
      toast.error('Action failed. Please try again.');
    }
    setConfirmAction(null);
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction) return null;

    switch (confirmAction.type) {
      case 'delete':
        return {
          title: 'Delete User',
          message: `Are you sure you want to delete ${confirmAction.user.name}? This action cannot be undone and will delete all their trades.`,
          confirmText: 'Delete',
          confirmColor: 'red' as const,
        };
      case 'status':
        return {
          title: confirmAction.newValue ? 'Activate User' : 'Deactivate User',
          message: `Are you sure you want to ${confirmAction.newValue ? 'activate' : 'deactivate'} ${confirmAction.user.name}?`,
          confirmText: confirmAction.newValue ? 'Activate' : 'Deactivate',
          confirmColor: confirmAction.newValue ? 'emerald' as const : 'red' as const,
        };
      case 'role':
        return {
          title: 'Change User Role',
          message: `Are you sure you want to change ${confirmAction.user.name}'s role to ${confirmAction.newValue}?`,
          confirmText: 'Change Role',
          confirmColor: 'emerald' as const,
        };
      case 'balance':
        return {
          title: 'Reset Balance',
          message: `Are you sure you want to reset ${confirmAction.user.name}'s balance to the default amount?`,
          confirmText: 'Reset',
          confirmColor: 'emerald' as const,
        };
    }
  };

  if (error && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchUsers();
            }}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">User Management</h1>
          <p className="text-sm text-slate-400">Track and manage platform users</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Users</p>
              <p className="text-lg font-bold text-white">{usersPagination?.total || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Wifi className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Online Now</p>
              <p className="text-lg font-bold text-emerald-400">{onlineCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Activity className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Active Trades</p>
              <p className="text-lg font-bold text-white">
                {recentTrades.filter(t => t.status === 'OPEN').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Recent Trades</p>
              <p className="text-lg font-bold text-white">{recentTrades.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Online Users & Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Online Users */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Online Users</h3>
            </div>
            <span className="text-xs text-slate-400">{onlineCount} active</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {isLoadingExtra ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
              </div>
            ) : onlineUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No users online</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {onlineUsers.map((user) => (
                  <div
                    key={user.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="h-8 w-8 bg-slate-700 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">
                        {formatCurrency(user.activeAccountType === 'LIVE' ? user.liveBalance : user.demoBalance)}
                      </p>
                      <p className="text-xs text-slate-400">{user.activeAccountType}</p>
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
          <div className="max-h-[200px] overflow-y-auto">
            {isLoadingExtra ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
              </div>
            ) : recentTrades.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No recent trades</div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/users/${trade.userId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-1.5 rounded-lg',
                        trade.direction === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      )}>
                        {trade.direction === 'UP' ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium">{trade.symbol}</p>
                          {trade.status === 'OPEN' && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{trade.userName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">{formatCurrency(trade.amount)}</p>
                      {trade.status === 'CLOSED' && trade.profit !== null && (
                        <p className={cn(
                          'text-xs font-medium',
                          trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                        )}>
                          {trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)}
                        </p>
                      )}
                      {trade.status === 'OPEN' && (
                        <p className="text-xs text-amber-400">In progress</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={usersFilter.role}
              onChange={(e) => setUsersFilter({ role: e.target.value as 'USER' | 'ADMIN' | '', page: 1 })}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              value={usersFilter.isActive === '' ? '' : usersFilter.isActive.toString()}
              onChange={(e) => {
                const value = e.target.value;
                setUsersFilter({
                  isActive: value === '' ? '' : value === 'true',
                  page: 1,
                });
              }}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select
              value={`${usersFilter.sortBy}-${usersFilter.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setUsersFilter({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
              }}
              className="px-3 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="demoBalance-desc">Highest Balance</option>
              <option value="demoBalance-asc">Lowest Balance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table - Desktop */}
      <div className="hidden lg:block bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Live Balance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Trades</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-9 w-9 bg-slate-700 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {onlineUserIds.has(user.id) && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-white font-medium">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          user.role === 'ADMIN'
                            ? 'bg-red-900/50 text-red-400'
                            : 'bg-slate-700 text-slate-300'
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {formatCurrency(user.demoBalance)}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {user._count?.trades ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium',
                            user.isActive
                              ? 'bg-emerald-900/50 text-emerald-400'
                              : 'bg-slate-700 text-slate-400'
                          )}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {onlineUserIds.has(user.id) && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                            Online
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'status',
                              user,
                              newValue: !user.isActive,
                            })
                          }
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            user.isActive
                              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
                              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30'
                          )}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            setConfirmAction({
                              type: 'role',
                              user,
                              newValue: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
                            })
                          }
                          className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors"
                          title={user.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                        >
                          {user.role === 'ADMIN' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'balance', user })}
                          className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-lg transition-colors"
                          title="Reset Balance"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        {user.role !== 'ADMIN' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'delete', user })}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {usersPagination && usersPagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Showing {(usersPagination.page - 1) * usersPagination.limit + 1} to{' '}
              {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} of{' '}
              {usersPagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUsersFilter({ page: usersPagination.page - 1 })}
                disabled={usersPagination.page === 1}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-white">
                {usersPagination.page} / {usersPagination.totalPages}
              </span>
              <button
                onClick={() => setUsersFilter({ page: usersPagination.page + 1 })}
                disabled={usersPagination.page === usersPagination.totalPages}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Cards - Mobile */}
      <div className="lg:hidden space-y-3">
        {isLoading && users.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No users found</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {onlineUserIds.has(user.id) && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-slate-800" />
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      user.role === 'ADMIN'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {user.role}
                  </span>
                  {onlineUserIds.has(user.id) && (
                    <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                      Online
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-xs text-slate-400">Live Balance</p>
                  <p className="text-sm text-white font-medium">{formatCurrency(user.demoBalance)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Trades</p>
                  <p className="text-sm text-white font-medium">{user._count?.trades ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Status</p>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      user.isActive ? 'text-emerald-400' : 'text-slate-400'
                    )}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                <button
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View
                </button>
                <button
                  onClick={() =>
                    setConfirmAction({
                      type: 'status',
                      user,
                      newValue: !user.isActive,
                    })
                  }
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    user.isActive
                      ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400'
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
                  )}
                >
                  {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}

        {usersPagination && usersPagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setUsersFilter({ page: usersPagination.page - 1 })}
              disabled={usersPagination.page === 1}
              className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="text-sm text-white">
              {usersPagination.page} / {usersPagination.totalPages}
            </span>
            <button
              onClick={() => setUsersFilter({ page: usersPagination.page + 1 })}
              disabled={usersPagination.page === usersPagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          {...getConfirmDialogProps()!}
          onConfirm={handleAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
