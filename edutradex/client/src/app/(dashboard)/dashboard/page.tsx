'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore, Trade } from '@/store/trade.store';
import { formatCurrency, cn } from '@/lib/utils';

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-slate-400 truncate">{title}</p>
          <p className="text-lg font-bold text-white truncate">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function RecentTradeItem({ trade }: { trade: Trade }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          trade.direction === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
        )}>
          {trade.direction === 'UP' ? (
            <ArrowUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-400" />
          )}
        </div>
        <div>
          <p className="text-sm text-white font-medium">{trade.symbol}</p>
          <p className="text-xs text-slate-500">{format(new Date(trade.createdAt), 'HH:mm')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'text-sm font-medium',
          trade.status === 'won' ? 'text-emerald-400' :
          trade.status === 'lost' ? 'text-red-400' : 'text-amber-400'
        )}>
          {trade.status === 'won' ? `+${formatCurrency(trade.profit || 0)}` :
           trade.status === 'lost' ? `-${formatCurrency(trade.amount)}` : 'Active'}
        </p>
        <p className="text-xs text-slate-500 capitalize">{trade.status}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { trades, stats, fetchStats } = useTradeStore();
  const [timeframe, setTimeframe] = useState<'all' | '7d' | '30d'>('all');

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const filteredTrades = useMemo(() => {
    if (timeframe === 'all') return trades;
    const days = timeframe === '7d' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return trades.filter(t => new Date(t.createdAt).getTime() >= cutoff);
  }, [timeframe, trades]);

  const filteredStats = useMemo(() => {
    if (timeframe === 'all') return stats;
    const totalTrades = filteredTrades.length;
    const wonTrades = filteredTrades.filter(t => t.status === 'won').length;
    const lostTrades = filteredTrades.filter(t => t.status === 'lost').length;
    const totalProfit = filteredTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
    return { ...stats, totalTrades, wonTrades, lostTrades, winRate, totalProfit };
  }, [filteredTrades, stats, timeframe]);

  const openTrades = useMemo(() => trades.filter(t => t.status === 'active'), [trades]);
  const recentTrades = filteredTrades.slice(0, 5);
  const currentBalance = user?.demoBalance || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Trader'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Your trading overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-slate-800 rounded-lg border border-slate-700 p-1">
            {(['all', '7d', '30d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  timeframe === tf ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                )}
              >
                {tf === 'all' ? 'All' : tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Balance"
          value={formatCurrency(currentBalance)}
          icon={Wallet}
          iconBg="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          title="Total Trades"
          value={filteredStats.totalTrades.toString()}
          icon={BarChart2}
          iconBg="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          title="Win Rate"
          value={`${filteredStats.winRate.toFixed(1)}%`}
          icon={Activity}
          iconBg="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          title="Profit/Loss"
          value={`${filteredStats.totalProfit >= 0 ? '+' : ''}${formatCurrency(filteredStats.totalProfit)}`}
          icon={filteredStats.totalProfit >= 0 ? TrendingUp : TrendingDown}
          iconBg={filteredStats.totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/dashboard/trade"
            className="flex flex-col items-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            <TrendingUp className="h-5 w-5 text-white" />
            <span className="text-xs font-medium text-white">Trade</span>
          </Link>
          <Link
            href="/dashboard/deposit"
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg transition-colors"
          >
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-medium text-slate-300">Deposit</span>
          </Link>
          <Link
            href="/dashboard/withdraw"
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg transition-colors"
          >
            <ArrowDownRight className="h-5 w-5 text-orange-400" />
            <span className="text-xs font-medium text-slate-300">Withdraw</span>
          </Link>
          <Link
            href="/dashboard/history"
            className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg transition-colors"
          >
            <BarChart2 className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-medium text-slate-300">History</span>
          </Link>
        </div>
      </div>

      {/* Open Trades + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Open Trades */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Open Trades</h2>
            </div>
            <span className="text-xs text-slate-400">{openTrades.length} active</span>
          </div>
          <div className="p-4">
            {openTrades.length === 0 ? (
              <div className="text-center py-6">
                <Clock className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-slate-400 mt-2 text-sm">No open trades</p>
                <Link
                  href="/dashboard/trade"
                  className="inline-block mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                >
                  Start Trading
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {openTrades.slice(0, 5).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-1.5 rounded',
                        trade.direction === 'UP' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                      )}>
                        {trade.direction === 'UP' ? (
                          <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium">{trade.symbol}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(trade.amount)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">{format(new Date(trade.createdAt), 'HH:mm')}</p>
                      <span className={cn(
                        'text-xs font-medium',
                        trade.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {trade.direction}
                      </span>
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
              <h2 className="text-sm font-semibold text-white">Recent Trades</h2>
            </div>
            {trades.length > 0 && (
              <Link href="/dashboard/history" className="text-xs text-emerald-400 hover:text-emerald-300">
                View all
              </Link>
            )}
          </div>
          <div className="p-4">
            {recentTrades.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-slate-400 mt-2 text-sm">No trades yet</p>
                <p className="text-slate-500 text-xs mt-1">Start trading to see your history</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                {recentTrades.map((trade) => (
                  <RecentTradeItem key={trade.id} trade={trade} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {filteredStats.totalTrades > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Performance Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-lg font-bold text-emerald-400">{filteredStats.wonTrades}</p>
              <p className="text-xs text-slate-400">Wins</p>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-lg font-bold text-red-400">{filteredStats.lostTrades}</p>
              <p className="text-xs text-slate-400">Losses</p>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className="text-lg font-bold text-white">{filteredStats.winRate.toFixed(0)}%</p>
              <p className="text-xs text-slate-400">Win Rate</p>
            </div>
            <div className="text-center p-3 bg-slate-700/30 rounded-lg">
              <p className={cn(
                'text-lg font-bold',
                filteredStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {formatCurrency(Math.abs(filteredStats.totalProfit))}
              </p>
              <p className="text-xs text-slate-400">{filteredStats.totalProfit >= 0 ? 'Profit' : 'Loss'}</p>
            </div>
          </div>
        </div>
      )}

      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-slate-800/40 rounded-xl p-4 border border-emerald-800/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600/20 rounded-lg hidden sm:block">
            <TrendingUp className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              {currentBalance > 0 ? 'Ready to trade?' : 'Get started'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentBalance > 0
                ? `Balance: ${formatCurrency(currentBalance)} - Trade Forex and OTC markets`
                : 'Make a deposit to start trading Forex and OTC markets'}
            </p>
          </div>
          <Link
            href={currentBalance > 0 ? '/dashboard/trade' : '/dashboard/deposit'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {currentBalance > 0 ? 'Trade Now' : 'Deposit'}
          </Link>
        </div>
      </div>
    </div>
  );
}
