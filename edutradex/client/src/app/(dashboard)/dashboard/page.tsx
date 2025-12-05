'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  Activity,
  ArrowUp,
  ArrowDown,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore, Trade } from '@/store/trade.store';
import { formatCurrency, cn } from '@/lib/utils';

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {trendValue && (
            <div className="flex items-center gap-1 mt-2">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <Icon className="h-6 w-6 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}

function RecentTradeRow({ trade }: { trade: Trade }) {
  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            trade.direction === 'UP' ? 'bg-emerald-500/10' : 'bg-red-500/10'
          )}
        >
          {trade.direction === 'UP' ? (
            <ArrowUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-400" />
          )}
        </div>
        <div>
          <p className="text-white font-medium">{trade.symbol}</p>
          <p className="text-slate-500 text-xs">{formatTime(trade.createdAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'font-medium',
            trade.status === 'won'
              ? 'text-emerald-400'
              : trade.status === 'lost'
              ? 'text-red-400'
              : 'text-yellow-400'
          )}
        >
          {trade.status === 'won'
            ? `+$${(trade.profit || 0).toFixed(2)}`
            : trade.status === 'lost'
            ? `-$${trade.amount.toFixed(2)}`
            : 'Active'}
        </p>
        <p className="text-slate-500 text-xs capitalize">{trade.status}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { trades, stats, fetchStats } = useTradeStore();

  // Calculate stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Get recent trades (last 5)
  const recentTrades = trades.slice(0, 5);

  // Calculate profit trend
  const profitTrend = stats.totalProfit >= 0 ? 'up' : 'down';
  const currentBalance = user?.demoBalance || 0;
  const baseBalance = currentBalance - stats.totalProfit;
  const profitPercent =
    stats.totalTrades > 0 && baseBalance > 0
      ? `${stats.totalProfit >= 0 ? '+' : ''}${((stats.totalProfit / baseBalance) * 100).toFixed(1)}%`
      : '0%';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s an overview of your trading activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Account Balance"
          value={formatCurrency(user?.demoBalance || 0)}
          icon={DollarSign}
        />
        <StatCard title="Total Trades" value={stats.totalTrades.toString()} icon={BarChart2} />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Activity}
        />
        <StatCard
          title="Total Profit"
          value={`${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toFixed(2)}`}
          icon={TrendingUp}
          trend={profitTrend}
          trendValue={profitPercent}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/dashboard/trade"
              className="p-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-center transition-colors"
            >
              <TrendingUp className="h-8 w-8 text-white mx-auto" />
              <p className="text-white font-medium mt-2">Start Trading</p>
            </Link>
            <Link
              href="/dashboard/history"
              className="p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-center transition-colors"
            >
              <BarChart2 className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-slate-300 font-medium mt-2">View History</p>
            </Link>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
            {trades.length > 0 && (
              <Link
                href="/dashboard/history"
                className="text-emerald-500 text-sm hover:text-emerald-400"
              >
                View all
              </Link>
            )}
          </div>
          {recentTrades.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-slate-600 mx-auto" />
              <p className="text-slate-400 mt-3">No trades yet</p>
              <p className="text-slate-500 text-sm">
                Start trading to see your history here
              </p>
            </div>
          ) : (
            <div>
              {recentTrades.map((trade) => (
                <RecentTradeRow key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      {stats.totalTrades > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-emerald-400 text-2xl font-bold">{stats.wonTrades}</p>
              <p className="text-slate-400 text-sm">Profitable Trades</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-red-400 text-2xl font-bold">{stats.lostTrades}</p>
              <p className="text-slate-400 text-sm">Loss Trades</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-white text-2xl font-bold">{stats.winRate.toFixed(0)}%</p>
              <p className="text-slate-400 text-sm">Profit Rate</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p
                className={cn(
                  'text-2xl font-bold',
                  stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                ${Math.abs(stats.totalProfit).toFixed(2)}
              </p>
              <p className="text-slate-400 text-sm">
                {stats.totalProfit >= 0 ? 'Total Profit' : 'Total Loss'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-emerald-900/50 to-slate-800 rounded-xl p-6 border border-emerald-800/50">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-600/20 rounded-lg">
            <Activity className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {(user?.demoBalance || 0) > 0 ? 'Ready to start trading?' : 'Get started with trading'}
            </h3>
            <p className="text-slate-400 mt-1">
              {(user?.demoBalance || 0) > 0 ? (
                <>Your current balance: ${formatCurrency(user?.demoBalance || 0).replace('$', '')}. Trade Forex and OTC markets.</>
              ) : (
                <>Make a deposit to start trading Forex and OTC markets. Build your trading skills and strategy.</>
              )}
            </p>
            <Link
              href={(user?.demoBalance || 0) > 0 ? '/dashboard/trade' : '/dashboard/deposits'}
              className="inline-block mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              {(user?.demoBalance || 0) > 0 ? 'Go to Trading' : 'Make a Deposit'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
