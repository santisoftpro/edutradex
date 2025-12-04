'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  UserCheck,
  BarChart3,
  Loader2,
  AlertCircle,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { useAdminStore } from '@/store/admin.store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-600/20 text-emerald-500',
    blue: 'bg-blue-600/20 text-blue-500',
    purple: 'bg-purple-600/20 text-purple-500',
    amber: 'bg-amber-600/20 text-amber-500',
    red: 'bg-red-600/20 text-red-500',
    cyan: 'bg-cyan-600/20 text-cyan-500',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3 md:p-6 border border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-slate-400 text-xs md:text-sm font-medium truncate">{title}</p>
          <p className="text-lg md:text-2xl font-bold text-white mt-1 md:mt-2 truncate">{value}</p>
          {subtext && <p className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1 truncate">{subtext}</p>}
        </div>
        <div className={`p-2 md:p-3 rounded-lg shrink-0 ${colorClasses[color]}`}>
          <Icon className="h-4 w-4 md:h-6 md:w-6" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const {
    platformStats,
    recentActivity,
    isLoading,
    error,
    fetchPlatformStats,
    fetchRecentActivity,
  } = useAdminStore();

  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    fetchPlatformStats();
    fetchRecentActivity(10);

    const fetchPendingCounts = async () => {
      try {
        const [depositStats, withdrawalCount] = await Promise.all([
          api.getDepositStats(),
          api.getPendingWithdrawalsCount(),
        ]);
        setPendingDeposits(depositStats.pending);
        setPendingWithdrawals(withdrawalCount);
      } catch (error) {
        console.error('Failed to fetch pending counts:', error);
      }
    };
    fetchPendingCounts();
  }, [fetchPlatformStats, fetchRecentActivity]);

  if (isLoading && !platformStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error && !platformStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error}</p>
          <button
            onClick={() => {
              fetchPlatformStats();
              fetchRecentActivity(10);
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
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm md:text-base mt-1">Platform overview and statistics</p>
      </div>

      {/* Pending Alerts */}
      {(pendingDeposits > 0 || pendingWithdrawals > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Deposits Alert */}
          {pendingDeposits > 0 && (
            <Link
              href="/admin/deposits"
              className="block bg-amber-900/30 border border-amber-900/50 rounded-xl p-4 hover:bg-amber-900/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600/20 rounded-lg">
                    <Bell className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Pending Deposits</p>
                    <p className="text-sm text-amber-400">
                      {pendingDeposits} deposit{pendingDeposits > 1 ? 's' : ''} awaiting approval
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-400">
                  <span className="text-sm font-medium hidden sm:inline">Review</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </Link>
          )}

          {/* Pending Withdrawals Alert */}
          {pendingWithdrawals > 0 && (
            <Link
              href="/admin/withdrawals"
              className="block bg-purple-900/30 border border-purple-900/50 rounded-xl p-4 hover:bg-purple-900/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Bell className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Pending Withdrawals</p>
                    <p className="text-sm text-purple-400">
                      {pendingWithdrawals} withdrawal{pendingWithdrawals > 1 ? 's' : ''} awaiting approval
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-purple-400">
                  <span className="text-sm font-medium hidden sm:inline">Review</span>
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <StatCard
          title="Total Users"
          value={platformStats?.totalUsers ?? 0}
          icon={Users}
          color="blue"
          subtext={`${platformStats?.activeUsers ?? 0} active`}
        />
        <StatCard
          title="Total Trades"
          value={platformStats?.totalTrades ?? 0}
          icon={Activity}
          color="emerald"
        />
        <StatCard
          title="Platform Win Rate"
          value={`${(platformStats?.platformWinRate ?? 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Total Volume"
          value={formatCurrency(platformStats?.totalVolume ?? 0)}
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          title="Admin Users"
          value={platformStats?.roleDistribution?.ADMIN ?? 0}
          icon={UserCheck}
          color="red"
        />
        <StatCard
          title="Open Trades"
          value={platformStats?.tradeStatusDistribution?.OPEN ?? 0}
          icon={BarChart3}
          color="cyan"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-3 md:p-4 border-b border-slate-700">
            <h2 className="text-base md:text-lg font-semibold text-white">Recent Trades</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {recentActivity?.recentTrades && recentActivity.recentTrades.length > 0 ? (
              recentActivity.recentTrades.slice(0, 5).map((trade) => {
                const getStatusDisplay = () => {
                  if (trade.status === 'OPEN') {
                    return { text: 'Open', color: 'text-blue-400' };
                  }
                  if (trade.status === 'CLOSED') {
                    if (trade.result === 'WIN') {
                      return { text: 'Profit', color: 'text-emerald-400' };
                    }
                    if (trade.result === 'LOSS') {
                      return { text: 'Loss', color: 'text-red-400' };
                    }
                    if (trade.result === 'TIE') {
                      return { text: 'Tie', color: 'text-amber-400' };
                    }
                    return { text: 'Closed', color: 'text-slate-400' };
                  }
                  return { text: 'Pending', color: 'text-amber-400' };
                };
                const status = getStatusDisplay();

                return (
                  <div key={trade.id} className="p-3 md:p-4 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm md:text-base truncate">{trade.symbol}</p>
                      <p className="text-xs md:text-sm text-slate-400">
                        <span className={trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'}>
                          {trade.direction}
                        </span>
                        {' • '}
                        {formatCurrency(trade.amount)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`font-medium text-sm md:text-base ${status.color}`}>
                        {status.text}
                      </p>
                      <p className="text-[10px] md:text-xs text-slate-500">
                        {formatDate(trade.openedAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 md:p-8 text-center text-slate-400 text-sm">No recent trades</div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-3 md:p-4 border-b border-slate-700">
            <h2 className="text-base md:text-lg font-semibold text-white">New Users</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {recentActivity?.newUsers && recentActivity.newUsers.length > 0 ? (
              recentActivity.newUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="p-3 md:p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="h-8 w-8 md:h-10 md:w-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-white font-medium text-sm md:text-base">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium text-sm md:text-base truncate">{user.name}</p>
                      <p className="text-xs md:text-sm text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span
                      className={`px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-red-900/50 text-red-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {user.role}
                    </span>
                    <p className="text-[10px] md:text-xs text-slate-500 mt-1">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 md:p-8 text-center text-slate-400 text-sm">No new users</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 md:p-6">
        <h2 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Trade Status Distribution</h2>
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-slate-700/50 rounded-lg p-3 md:p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-cyan-400">
              {platformStats?.tradeStatusDistribution?.OPEN ?? 0}
            </p>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">Open</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 md:p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-emerald-400">
              {platformStats?.tradeStatusDistribution?.CLOSED ?? 0}
            </p>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">Closed</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 md:p-4 text-center">
            <p className="text-xl md:text-2xl font-bold text-slate-400">
              {platformStats?.tradeStatusDistribution?.CANCELLED ?? 0}
            </p>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5 md:mt-1">Cancelled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
