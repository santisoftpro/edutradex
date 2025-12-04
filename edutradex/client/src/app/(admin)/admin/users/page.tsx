'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '@/store/admin.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { AdminUser } from '@/types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
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
  const [showFilters, setShowFilters] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'status' | 'role' | 'balance';
    user: AdminUser;
    newValue?: boolean | string;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, usersFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchInput !== usersFilter.search) {
        setUsersFilter({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchInput, usersFilter.search, setUsersFilter]);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <p className="text-slate-400 mt-1">Manage platform users and their accounts</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
            showFilters
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          )}
        >
          <Filter className="h-5 w-5" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Role</label>
              <select
                value={usersFilter.role}
                onChange={(e) => setUsersFilter({ role: e.target.value as 'USER' | 'ADMIN' | '', page: 1 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Roles</option>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
              <select
                value={usersFilter.isActive === '' ? '' : usersFilter.isActive.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setUsersFilter({
                    isActive: value === '' ? '' : value === 'true',
                    page: 1,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Sort By</label>
              <select
                value={`${usersFilter.sortBy}-${usersFilter.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setUsersFilter({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Role</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Balance</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Trades</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Joined</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-white">
                      {formatCurrency(user.demoBalance)}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {user._count?.trades ?? 0}
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
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
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {(usersPagination.page - 1) * usersPagination.limit + 1} to{' '}
              {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} of{' '}
              {usersPagination.total} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUsersFilter({ page: usersPagination.page - 1 })}
                disabled={usersPagination.page === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-white">
                Page {usersPagination.page} of {usersPagination.totalPages}
              </span>
              <button
                onClick={() => setUsersFilter({ page: usersPagination.page + 1 })}
                disabled={usersPagination.page === usersPagination.totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
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
