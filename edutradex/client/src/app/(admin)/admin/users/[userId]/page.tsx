'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  DollarSign,
  Activity,
  TrendingUp,
  Loader2,
  AlertCircle,
  UserX,
  UserCheck,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '@/store/admin.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';

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

function ResetBalanceDialog({
  isOpen,
  userName,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  userName: string;
  onConfirm: (balance?: number) => void;
  onCancel: () => void;
}) {
  const [customBalance, setCustomBalance] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">Reset Balance</h3>
        <p className="mt-2 text-slate-400">
          Reset {userName}&apos;s balance to zero or set a custom value.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={!useCustom}
              onChange={() => setUseCustom(false)}
              className="text-emerald-500"
            />
            <span className="text-white">Reset to $0 (Clear balance)</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={useCustom}
              onChange={() => setUseCustom(true)}
              className="text-emerald-500"
            />
            <span className="text-white">Set custom balance</span>
          </label>
          {useCustom && (
            <input
              type="number"
              value={customBalance}
              onChange={(e) => setCustomBalance(e.target.value)}
              placeholder="Enter amount..."
              min="0"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </div>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const balance = useCustom && customBalance ? parseFloat(customBalance) : undefined;
              onConfirm(balance);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Reset Balance
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const {
    selectedUser,
    isLoading,
    error,
    fetchUserDetail,
    updateUserStatus,
    updateUserRole,
    resetUserBalance,
    deleteUser,
    clearSelectedUser,
    clearError,
  } = useAdminStore();

  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'status' | 'role';
    newValue?: boolean | string;
  } | null>(null);
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);

  useEffect(() => {
    fetchUserDetail(userId);
    return () => clearSelectedUser();
  }, [userId, fetchUserDetail, clearSelectedUser]);

  const handleAction = async () => {
    if (!confirmAction || !selectedUser) return;

    try {
      switch (confirmAction.type) {
        case 'delete':
          await deleteUser(selectedUser.id);
          toast.success('User deleted successfully');
          router.push('/admin/users');
          break;
        case 'status':
          await updateUserStatus(selectedUser.id, confirmAction.newValue as boolean);
          toast.success(`User ${confirmAction.newValue ? 'activated' : 'deactivated'} successfully`);
          break;
        case 'role':
          await updateUserRole(selectedUser.id, confirmAction.newValue as 'USER' | 'ADMIN');
          toast.success('User role updated successfully');
          break;
      }
    } catch {
      toast.error('Action failed. Please try again.');
    }
    setConfirmAction(null);
  };

  const handleResetBalance = async (balance?: number) => {
    if (!selectedUser) return;
    try {
      await resetUserBalance(selectedUser.id, balance);
      toast.success('User balance reset successfully');
    } catch {
      toast.error('Failed to reset balance');
    }
    setShowBalanceDialog(false);
  };

  const getConfirmDialogProps = () => {
    if (!confirmAction || !selectedUser) return null;

    switch (confirmAction.type) {
      case 'delete':
        return {
          title: 'Delete User',
          message: `Are you sure you want to delete ${selectedUser.name}? This action cannot be undone and will delete all their trades.`,
          confirmText: 'Delete',
          confirmColor: 'red' as const,
        };
      case 'status':
        return {
          title: confirmAction.newValue ? 'Activate User' : 'Deactivate User',
          message: `Are you sure you want to ${confirmAction.newValue ? 'activate' : 'deactivate'} ${selectedUser.name}?`,
          confirmText: confirmAction.newValue ? 'Activate' : 'Deactivate',
          confirmColor: confirmAction.newValue ? 'emerald' as const : 'red' as const,
        };
      case 'role':
        return {
          title: 'Change User Role',
          message: `Are you sure you want to change ${selectedUser.name}'s role to ${confirmAction.newValue}?`,
          confirmText: 'Change Role',
          confirmColor: 'emerald' as const,
        };
    }
  };

  if (isLoading && !selectedUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error && !selectedUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchUserDetail(userId);
            }}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="mt-4 text-slate-400">User not found</p>
          <button
            onClick={() => router.push('/admin/users')}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/users')}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">User Details</h1>
          <p className="text-slate-400 mt-1">View and manage user account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-20 w-20 bg-slate-700 rounded-full flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-white">{selectedUser.name}</h2>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    selectedUser.role === 'ADMIN'
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {selectedUser.role}
                </span>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    selectedUser.isActive
                      ? 'bg-emerald-900/50 text-emerald-400'
                      : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-400">
                <Mail className="h-5 w-5" />
                <span className="text-white">{selectedUser.email}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <Calendar className="h-5 w-5" />
                <span className="text-white">Joined {formatDate(selectedUser.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <DollarSign className="h-5 w-5" />
                <span className="text-white">{formatCurrency(selectedUser.demoBalance)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700 space-y-2">
              <button
                onClick={() =>
                  setConfirmAction({
                    type: 'status',
                    newValue: !selectedUser.isActive,
                  })
                }
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  selectedUser.isActive
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                )}
              >
                {selectedUser.isActive ? (
                  <>
                    <UserX className="h-4 w-4" />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Activate User
                  </>
                )}
              </button>
              <button
                onClick={() =>
                  setConfirmAction({
                    type: 'role',
                    newValue: selectedUser.role === 'ADMIN' ? 'USER' : 'ADMIN',
                  })
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <Shield className="h-4 w-4" />
                {selectedUser.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
              </button>
              <button
                onClick={() => setShowBalanceDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Balance
              </button>
              {selectedUser.role !== 'ADMIN' && (
                <button
                  onClick={() => setConfirmAction({ type: 'delete' })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600/20 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Trades</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedUser.stats.totalTrades}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedUser.stats.winRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-3 rounded-lg',
                  selectedUser.stats.totalProfit >= 0
                    ? 'bg-emerald-600/20'
                    : 'bg-red-600/20'
                )}>
                  <DollarSign className={cn(
                    'h-6 w-6',
                    selectedUser.stats.totalProfit >= 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  )} />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Profit</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    selectedUser.stats.totalProfit >= 0
                      ? 'text-emerald-500'
                      : 'text-red-500'
                  )}>
                    {formatCurrency(selectedUser.stats.totalProfit)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
            </div>
            <div className="divide-y divide-slate-700">
              {selectedUser.recentTrades && selectedUser.recentTrades.length > 0 ? (
                selectedUser.recentTrades.map((trade) => (
                  <div key={trade.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{trade.symbol}</p>
                      <p className="text-sm text-slate-400">
                        {trade.direction} • {formatCurrency(trade.amount)} • {trade.duration}s
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'font-medium',
                          trade.result === 'WIN'
                            ? 'text-emerald-500'
                            : trade.result === 'LOSS'
                            ? 'text-red-500'
                            : 'text-slate-400'
                        )}
                      >
                        {trade.status === 'OPEN' ? 'Open' : trade.result || 'Pending'}
                        {trade.profit !== null && (
                          <span className="ml-2">
                            ({trade.profit >= 0 ? '+' : ''}{formatCurrency(trade.profit)})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(trade.openedAt)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">No trades yet</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          {...getConfirmDialogProps()!}
          onConfirm={handleAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      <ResetBalanceDialog
        isOpen={showBalanceDialog}
        userName={selectedUser.name}
        onConfirm={handleResetBalance}
        onCancel={() => setShowBalanceDialog(false)}
      />
    </div>
  );
}
