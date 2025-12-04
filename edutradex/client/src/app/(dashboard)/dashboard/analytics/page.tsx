'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Activity,
  DollarSign,
  Target,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { useTradeStore } from '@/store/trade.store';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const { trades } = useTradeStore();
  const { user } = useAuthStore();

  const closedTrades = trades.filter((t) => t.status !== 'active');

  // Calculate stats
  const stats = useMemo(() => {
    const wonTrades = closedTrades.filter(t => t.status === 'won').length;
    const lostTrades = closedTrades.filter(t => t.status === 'lost').length;
    const totalTrades = closedTrades.length;
    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;

    return { totalTrades, wonTrades, lostTrades, totalProfit, winRate };
  }, [closedTrades]);

  const analytics = useMemo(() => {
    if (closedTrades.length === 0) {
      return {
        avgTradeSize: 0,
        avgProfit: 0,
        bestTrade: 0,
        worstTrade: 0,
        totalVolume: 0,
        forexTrades: 0,
        otcTrades: 0,
        upTrades: 0,
        downTrades: 0,
        profitByDay: [] as { day: string; profit: number }[],
      };
    }

    const profits = closedTrades.map((t) => t.profit || 0);
    const amounts = closedTrades.map((t) => t.amount);

    // Group by day
    const byDay = closedTrades.reduce((acc, trade) => {
      const day = format(new Date(trade.createdAt), 'EEE');
      acc[day] = (acc[day] || 0) + (trade.profit || 0);
      return acc;
    }, {} as Record<string, number>);

    return {
      avgTradeSize: amounts.reduce((a, b) => a + b, 0) / amounts.length,
      avgProfit: profits.reduce((a, b) => a + b, 0) / profits.length,
      bestTrade: Math.max(...profits),
      worstTrade: Math.min(...profits),
      totalVolume: amounts.reduce((a, b) => a + b, 0),
      forexTrades: closedTrades.filter((t) => t.marketType === 'forex').length,
      otcTrades: closedTrades.filter((t) => t.marketType === 'otc').length,
      upTrades: closedTrades.filter((t) => t.direction === 'UP').length,
      downTrades: closedTrades.filter((t) => t.direction === 'DOWN').length,
      profitByDay: Object.entries(byDay).map(([day, profit]) => ({ day, profit })),
    };
  }, [closedTrades]);

  const currentBalance = user?.demoBalance ?? 0;
  const baseBalance = currentBalance - stats.totalProfit;
  const profitPercent = baseBalance > 0
    ? ((currentBalance - baseBalance) / baseBalance) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Track your trading performance and patterns</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Profit/Loss"
          value={`${stats.totalProfit >= 0 ? '+' : ''}$${stats.totalProfit.toFixed(2)}`}
          icon={DollarSign}
          trend={stats.totalProfit >= 0 ? 'up' : 'down'}
          color={stats.totalProfit >= 0 ? 'emerald' : 'red'}
        />
        <StatCard
          title="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          icon={Target}
          subtitle={`${stats.wonTrades}W / ${stats.lostTrades}L`}
          color="blue"
        />
        <StatCard
          title="Total Volume"
          value={`$${analytics.totalVolume.toFixed(2)}`}
          icon={Activity}
          subtitle={`${stats.totalTrades} trades`}
          color="purple"
        />
        <StatCard
          title="Account Growth"
          value={`${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`}
          icon={TrendingUp}
          trend={profitPercent >= 0 ? 'up' : 'down'}
          color={profitPercent >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win/Loss Distribution */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-500" />
            Win/Loss Distribution
          </h2>
          {stats.totalTrades === 0 ? (
            <EmptyState message="Complete some trades to see distribution" />
          ) : (
            <div className="flex items-center justify-center gap-8">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="20"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="20"
                    strokeDasharray={`${stats.winRate * 4.4} 440`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {stats.winRate.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-emerald-500 rounded" />
                  <span className="text-slate-300">Profit: {stats.wonTrades}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-slate-600 rounded" />
                  <span className="text-slate-300">Lost: {stats.lostTrades}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Market Distribution */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Trading Patterns
          </h2>
          {stats.totalTrades === 0 ? (
            <EmptyState message="Complete some trades to see patterns" />
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Market Type</span>
                </div>
                <div className="flex gap-2">
                  {analytics.forexTrades > 0 && (
                    <div
                      className="h-8 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-medium px-3"
                      style={{
                        flex: analytics.forexTrades,
                        minWidth: '80px',
                      }}
                    >
                      Forex ({analytics.forexTrades})
                    </div>
                  )}
                  {analytics.otcTrades > 0 && (
                    <div
                      className="h-8 bg-purple-600 rounded flex items-center justify-center text-white text-xs font-medium px-3"
                      style={{
                        flex: analytics.otcTrades,
                        minWidth: '80px',
                      }}
                    >
                      OTC ({analytics.otcTrades})
                    </div>
                  )}
                  {analytics.forexTrades === 0 && analytics.otcTrades === 0 && (
                    <div className="h-8 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs font-medium w-full">
                      No trades yet
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Direction</span>
                </div>
                <div className="flex gap-2">
                  {analytics.upTrades > 0 && (
                    <div
                      className="h-8 bg-emerald-600 rounded flex items-center justify-center text-white text-xs font-medium px-3"
                      style={{
                        flex: analytics.upTrades,
                        minWidth: '80px',
                      }}
                    >
                      UP ({analytics.upTrades})
                    </div>
                  )}
                  {analytics.downTrades > 0 && (
                    <div
                      className="h-8 bg-red-600 rounded flex items-center justify-center text-white text-xs font-medium px-3"
                      style={{
                        flex: analytics.downTrades,
                        minWidth: '80px',
                      }}
                    >
                      DOWN ({analytics.downTrades})
                    </div>
                  )}
                  {analytics.upTrades === 0 && analytics.downTrades === 0 && (
                    <div className="h-8 bg-slate-700 rounded flex items-center justify-center text-slate-400 text-xs font-medium w-full">
                      No trades yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Best Trade"
          value={`+$${analytics.bestTrade.toFixed(2)}`}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          title="Worst Trade"
          value={`$${analytics.worstTrade.toFixed(2)}`}
          icon={TrendingDown}
          color="red"
        />
        <MetricCard
          title="Avg Trade Size"
          value={`$${analytics.avgTradeSize.toFixed(2)}`}
          icon={Zap}
          color="yellow"
        />
        <MetricCard
          title="Avg Profit/Trade"
          value={`${analytics.avgProfit >= 0 ? '+' : ''}$${analytics.avgProfit.toFixed(2)}`}
          icon={Activity}
          color={analytics.avgProfit >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-blue-900/50 to-slate-800 rounded-xl p-6 border border-blue-800/50">
        <h3 className="text-lg font-semibold text-white mb-3">Trading Tips</h3>
        <ul className="space-y-2 text-slate-300 text-sm">
          <li>• Start with small amounts to learn market behavior</li>
          <li>• Track your win rate and adjust your strategy accordingly</li>
          <li>• Avoid overtrading - quality over quantity</li>
          <li>• Use different timeframes to understand market trends</li>
          <li>• Practice risk management - never risk more than you can afford</li>
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
  trend?: 'up' | 'down';
  color: 'emerald' | 'red' | 'blue' | 'purple' | 'yellow';
}) {
  const colors = {
    emerald: 'text-emerald-500 bg-emerald-500/10',
    red: 'text-red-500 bg-red-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p
            className={cn(
              'text-2xl font-bold mt-1',
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-white'
            )}
          >
            {value}
          </p>
          {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-lg', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'emerald' | 'red' | 'yellow';
}) {
  const colors = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', colors[color])} />
        <div>
          <p className="text-slate-400 text-xs">{title}</p>
          <p className={cn('font-bold', colors[color])}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Activity className="h-12 w-12 text-slate-600" />
      <p className="text-slate-400 mt-3">{message}</p>
    </div>
  );
}
