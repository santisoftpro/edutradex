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
  AlertTriangle,
  TrendingUp as SparkUp,
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
    <div className="rounded-xl p-4 sm:p-6 border border-slate-700/80 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-slate-800/80 shadow-lg shadow-emerald-900/10 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400/90 uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            {title}
          </p>
          <p className="text-xl md:text-2xl font-bold text-white/90 leading-tight">{value}</p>
          {trendValue && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-slate-800/70 border border-slate-700">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={trend === 'up' ? 'text-emerald-400' : 'text-red-400'}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border border-slate-700/80 bg-slate-800/60">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
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

  const profitTrend = filteredStats.totalProfit >= 0 ? 'up' : 'down';
  const currentBalance = user?.demoBalance || 0;
  const baseBalance = currentBalance - filteredStats.totalProfit;
  const profitPercent =
    filteredStats.totalTrades > 0 && baseBalance > 0
      ? `${filteredStats.totalProfit >= 0 ? '+' : ''}${((filteredStats.totalProfit / baseBalance) * 100).toFixed(1)}%`
      : '0%';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-400 mt-1">
            Here&apos;s an overview of your trading activity
          </p>
        </div>
        <div className="flex flex-col gap-2 items-start sm:flex-row sm:items-center sm:gap-3 text-sm text-slate-300">
          <div className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
            Balance: <span className="font-semibold text-white">{formatCurrency(currentBalance)}</span>
          </div>
          <div className="px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
            Win rate: <span className="font-semibold text-emerald-400">{filteredStats.winRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Showing:</span>
          <div className="flex gap-1 bg-slate-800 rounded-lg border border-slate-700 p-1">
            {(['all', '7d', '30d'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors',
                  timeframe === tf ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                )}
              >
                {tf === 'all' ? 'All time' : tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Account Balance"
          value={formatCurrency(user?.demoBalance || 0)}
          icon={DollarSign}
        />
        <StatCard title="Total Trades" value={filteredStats.totalTrades.toString()} icon={BarChart2} />
        <StatCard
          title="Win Rate"
          value={`${filteredStats.winRate.toFixed(1)}%`}
          icon={Activity}
        />
        <StatCard
          title="Total Profit"
          value={`${filteredStats.totalProfit >= 0 ? '+' : ''}$${filteredStats.totalProfit.toFixed(2)}`}
          icon={TrendingUp}
          trend={profitTrend}
          trendValue={profitPercent}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ActionCard href="/dashboard/trade" icon={TrendingUp} label="Start Trading" highlight />
            <ActionCard href="/dashboard/deposit" icon={DollarSign} label="Deposit" />
            <ActionCard href="/dashboard/withdraw" icon={TrendingDown} label="Withdraw" />
            <ActionCard href="/dashboard/history" icon={BarChart2} label="History" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Open Trades</h2>
              <p className="text-slate-400 text-sm">Live positions with quick status</p>
            </div>
            <Link href="/dashboard/trade" className="text-emerald-500 text-sm hover:text-emerald-400">
              Go to Trading
            </Link>
          </div>
          {openTrades.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-10 w-10 text-slate-600 mx-auto" />
              <p className="text-slate-400 mt-2 text-sm">No open trades</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar">
              {openTrades.slice(0, 5).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/70">
                  <div>
                    <p className="text-white font-medium text-sm">{trade.symbol}</p>
                    <p className="text-slate-400 text-xs">Amount: {formatCurrency(trade.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Opened: {format(new Date(trade.createdAt), 'HH:mm')}</p>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold mt-1',
                      trade.direction === 'UP' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    )}>
                      {trade.direction}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Funding & Health</h2>
              <p className="text-slate-400 text-sm">Keep your balance and goals on track</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <p className="text-white font-semibold text-sm">Balance snapshot</p>
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(currentBalance)}</p>
              <p className="text-slate-400 text-xs">
                {currentBalance < 20
                  ? 'Low balance detected. Consider a quick top-up before trading.'
                  : 'Balance is healthy. Stay within your risk limits.'}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/dashboard/deposit"
                  className="flex-1 text-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Deposit
                </Link>
                <Link
                  href="/dashboard/withdraw"
                  className="flex-1 text-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Withdraw
                </Link>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2">
                <SparkUp className="h-4 w-4 text-emerald-400" />
                <p className="text-white font-semibold text-sm">Recent performance</p>
              </div>
              <p className="text-slate-300 text-sm">
                {filteredStats.totalTrades > 0
                  ? `Win rate ${filteredStats.winRate.toFixed(1)}% • Profit ${filteredStats.totalProfit >= 0 ? '+' : ''}$${filteredStats.totalProfit.toFixed(2)}`
                  : 'Not enough data yet. Place trades to see insights.'}
              </p>
              <p className="text-slate-400 text-xs">
                Timeframe: {timeframe === 'all' ? 'All time' : timeframe.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {filteredStats.totalTrades > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Profitable Trades" value={filteredStats.wonTrades} valueClass="text-emerald-400" />
            <SummaryCard label="Loss Trades" value={filteredStats.lostTrades} valueClass="text-red-400" />
            <SummaryCard label="Profit Rate" value={`${filteredStats.winRate.toFixed(0)}%`} />
            <SummaryCard
              label={filteredStats.totalProfit >= 0 ? 'Total Profit' : 'Total Loss'}
              value={`$${Math.abs(filteredStats.totalProfit).toFixed(2)}`}
              valueClass={filteredStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
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
              href={(user?.demoBalance || 0) > 0 ? '/dashboard/trade' : '/dashboard/deposit'}
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

function ActionCard({
  href,
  icon: Icon,
  label,
  highlight = false,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'p-4 rounded-lg text-center transition-colors border',
        highlight
          ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-700 text-white'
          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
      )}
    >
      <Icon className="h-6 w-6 mx-auto" />
      <p className="font-medium mt-2 text-sm">{label}</p>
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="text-center p-4 bg-slate-700/50 rounded-lg border border-slate-600/60">
      <p className={cn('text-xl font-bold text-white', valueClass)}>{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </div>
  );
}
