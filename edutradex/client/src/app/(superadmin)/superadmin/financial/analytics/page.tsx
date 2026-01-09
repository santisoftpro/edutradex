'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, DollarSign,
  Target, Settings, Download, RefreshCw, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Percent, Activity,
} from 'lucide-react';
import { api, RevenueTrendData, TopDepositor, TopTrader, AdvancedAnalytics, BudgetTargets, AlertThresholds } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export default function FinancialAnalyticsPage() {
  const queryClient = useQueryClient();
  const [trendDays, setTrendDays] = useState(30);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'budget' | 'alerts'>('budget');
  const [adminPassword, setAdminPassword] = useState('');

  // Fetch data
  const { data: revenueTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['revenue-trend', trendDays],
    queryFn: () => api.getRevenueTrend(trendDays),
  });

  const { data: topDepositors } = useQuery({
    queryKey: ['top-depositors'],
    queryFn: () => api.getTopDepositors(10),
  });

  const { data: topTraders } = useQuery({
    queryKey: ['top-traders'],
    queryFn: () => api.getTopTraders(10),
  });

  const { data: analytics } = useQuery({
    queryKey: ['advanced-analytics'],
    queryFn: () => api.getAdvancedAnalytics(),
  });

  const { data: budgetTargets } = useQuery({
    queryKey: ['budget-targets'],
    queryFn: () => api.getBudgetTargets(),
  });

  const { data: alertThresholds } = useQuery({
    queryKey: ['alert-thresholds'],
    queryFn: () => api.getAlertThresholds(),
  });

  // Form states for settings
  const [budgetForm, setBudgetForm] = useState<Partial<BudgetTargets>>({});
  const [alertsForm, setAlertsForm] = useState<Partial<AlertThresholds>>({});

  // Mutations
  const saveBudgetMutation = useMutation({
    mutationFn: () => api.setBudgetTargets(budgetForm, adminPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-targets'] });
      toast.success('Budget targets saved');
      setShowSettingsModal(false);
      setAdminPassword('');
    },
    onError: () => toast.error('Failed to save budget targets'),
  });

  const saveAlertsMutation = useMutation({
    mutationFn: () => api.setAlertThresholds(alertsForm, adminPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-thresholds'] });
      toast.success('Alert thresholds saved');
      setShowSettingsModal(false);
      setAdminPassword('');
    },
    onError: () => toast.error('Failed to save alert thresholds'),
  });

  // CSV Export
  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}.csv`);
  };

  // Calculate trend totals
  const trendTotals = revenueTrend?.reduce((acc, day) => ({
    grossRevenue: acc.grossRevenue + day.grossRevenue,
    netProfit: acc.netProfit + day.netProfit,
    volume: acc.volume + day.volume,
    trades: acc.trades + day.trades,
    deposits: acc.deposits + day.deposits,
    withdrawals: acc.withdrawals + day.withdrawals,
  }), { grossRevenue: 0, netProfit: 0, volume: 0, trades: 0, deposits: 0, withdrawals: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Analytics</h1>
          <p className="text-slate-400 mt-1">Advanced metrics, charts, and business intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBudgetForm(budgetTargets || {});
              setAlertsForm(alertThresholds || {});
              setShowSettingsModal(true);
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <DollarSign className="h-4 w-4" />
              Avg. LTV
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(analytics.averageLTV)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Users className="h-4 w-4" />
              User Retention
            </div>
            <p className="text-2xl font-bold text-blue-400">{formatPercent(analytics.userRetentionRate)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Activity className="h-4 w-4" />
              Active Users
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatPercent(analytics.activeUserPercentage)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Percent className="h-4 w-4" />
              Deposit/Withdrawal
            </div>
            <p className="text-2xl font-bold text-purple-400">{analytics.depositToWithdrawalRatio.toFixed(2)}x</p>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
            <p className="text-slate-400 text-sm">Daily revenue and profit over time</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => revenueTrend && exportCSV(revenueTrend as unknown as Record<string, unknown>[], 'revenue-trend')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {trendLoading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : revenueTrend && revenueTrend.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(d) => d.split('-').slice(1).join('/')} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend />
                <Area type="monotone" dataKey="grossRevenue" name="Gross Revenue" stroke="#10b981" fill="#10b98133" strokeWidth={2} />
                <Area type="monotone" dataKey="netProfit" name="Net Profit" stroke="#3b82f6" fill="#3b82f633" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-slate-400">
            No data available for the selected period
          </div>
        )}

        {/* Period Summary */}
        {trendTotals && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mt-6 pt-6 border-t border-slate-700">
            <div>
              <p className="text-slate-400 text-sm">Total Revenue</p>
              <p className="text-white font-semibold">{formatCurrency(trendTotals.grossRevenue)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Net Profit</p>
              <p className={cn("font-semibold", trendTotals.netProfit >= 0 ? "text-green-400" : "text-red-400")}>
                {formatCurrency(trendTotals.netProfit)}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Volume</p>
              <p className="text-white font-semibold">{formatCurrency(trendTotals.volume)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Trades</p>
              <p className="text-white font-semibold">{formatNumber(trendTotals.trades)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Deposits</p>
              <p className="text-green-400 font-semibold">{formatCurrency(trendTotals.deposits)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Withdrawals</p>
              <p className="text-red-400 font-semibold">{formatCurrency(trendTotals.withdrawals)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Deposits vs Withdrawals Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Cash Flow (Deposits vs Withdrawals)</h2>
          {revenueTrend && revenueTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickFormatter={(d) => d.split('-')[2]} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend />
                  <Bar dataKey="deposits" name="Deposits" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
          )}
        </div>

        {/* Trading Volume Chart */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Trading Volume & Activity</h2>
          {revenueTrend && revenueTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickFormatter={(d) => d.split('-')[2]} />
                  <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="volume" name="Volume" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="trades" name="Trades" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
          )}
        </div>
      </div>

      {/* Top Depositors & Traders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Depositors */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Top Depositors</h2>
            <button
              onClick={() => topDepositors && exportCSV(topDepositors as unknown as Record<string, unknown>[], 'top-depositors')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">User</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {topDepositors?.map((d, i) => (
                  <tr key={d.userId} className="border-b border-slate-700/50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs w-4">{i + 1}.</span>
                        <div>
                          <p className="text-white text-sm">{d.name}</p>
                          <p className="text-slate-400 text-xs">{d.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right text-green-400 font-medium">{formatCurrency(d.totalDeposits)}</td>
                    <td className="text-right text-slate-400">{d.depositCount}</td>
                  </tr>
                ))}
                {(!topDepositors || topDepositors.length === 0) && (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-400">No depositors found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Traders */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Top Traders (by Volume)</h2>
            <button
              onClick={() => topTraders && exportCSV(topTraders as unknown as Record<string, unknown>[], 'top-traders')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">User</th>
                  <th className="text-right py-2">Volume</th>
                  <th className="text-right py-2">Win Rate</th>
                  <th className="text-right py-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {topTraders?.map((t, i) => (
                  <tr key={t.userId} className="border-b border-slate-700/50">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs w-4">{i + 1}.</span>
                        <div>
                          <p className="text-white text-sm">{t.name}</p>
                          <p className="text-slate-400 text-xs">{t.totalTrades} trades</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right text-white font-medium">{formatCurrency(t.totalVolume)}</td>
                    <td className="text-right text-blue-400">{formatPercent(t.winRate)}</td>
                    <td className={cn("text-right font-medium", t.netPnL >= 0 ? "text-green-400" : "text-red-400")}>
                      {formatCurrency(t.netPnL)}
                    </td>
                  </tr>
                ))}
                {(!topTraders || topTraders.length === 0) && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-400">No traders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Grid */}
      {analytics && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Business Health Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Avg. Deposit Size</p>
              <p className="text-xl font-bold text-white">{formatCurrency(analytics.averageDepositSize)}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Avg. Trades/User</p>
              <p className="text-xl font-bold text-white">{formatNumber(analytics.averageTradesPerUser)}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Avg. Revenue/Trade</p>
              <p className="text-xl font-bold text-white">{formatCurrency(analytics.avgRevenuePerTrade)}</p>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm mb-1">Real vs Test Users</p>
              <p className="text-xl font-bold text-white">{analytics.realVsTestRatio.toFixed(2)}x</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-lg m-4 border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Financial Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setSettingsTab('budget')}
                className={cn(
                  "flex-1 py-3 text-center transition-colors",
                  settingsTab === 'budget' ? "text-green-400 border-b-2 border-green-400" : "text-slate-400 hover:text-white"
                )}
              >
                <Target className="h-4 w-4 inline mr-2" />
                Budget Targets
              </button>
              <button
                onClick={() => setSettingsTab('alerts')}
                className={cn(
                  "flex-1 py-3 text-center transition-colors",
                  settingsTab === 'alerts' ? "text-green-400 border-b-2 border-green-400" : "text-slate-400 hover:text-white"
                )}
              >
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Alert Thresholds
              </button>
            </div>

            <div className="p-6 space-y-4">
              {settingsTab === 'budget' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Monthly Revenue Target</label>
                      <input
                        type="number"
                        value={budgetForm.monthlyRevenueTarget || ''}
                        onChange={(e) => setBudgetForm({ ...budgetForm, monthlyRevenueTarget: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="$0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Monthly Profit Target</label>
                      <input
                        type="number"
                        value={budgetForm.monthlyProfitTarget || ''}
                        onChange={(e) => setBudgetForm({ ...budgetForm, monthlyProfitTarget: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="$0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Daily Volume Target</label>
                      <input
                        type="number"
                        value={budgetForm.dailyVolumeTarget || ''}
                        onChange={(e) => setBudgetForm({ ...budgetForm, dailyVolumeTarget: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="$0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">New Users Target</label>
                      <input
                        type="number"
                        value={budgetForm.newUsersTarget || ''}
                        onChange={(e) => setBudgetForm({ ...budgetForm, newUsersTarget: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">Deposits Target</label>
                      <input
                        type="number"
                        value={budgetForm.depositsTarget || ''}
                        onChange={(e) => setBudgetForm({ ...budgetForm, depositsTarget: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="$0"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Exposure Alert ($)</label>
                      <input
                        type="number"
                        value={alertsForm.exposureAlertThreshold || ''}
                        onChange={(e) => setAlertsForm({ ...alertsForm, exposureAlertThreshold: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="100000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Daily Loss Limit ($)</label>
                      <input
                        type="number"
                        value={alertsForm.dailyLossLimit || ''}
                        onChange={(e) => setAlertsForm({ ...alertsForm, dailyLossLimit: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="50000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Low Balance Alert ($)</label>
                      <input
                        type="number"
                        value={alertsForm.lowBalanceAlert || ''}
                        onChange={(e) => setAlertsForm({ ...alertsForm, lowBalanceAlert: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">High Volume Alert ($)</label>
                      <input
                        type="number"
                        value={alertsForm.highVolumeAlert || ''}
                        onChange={(e) => setAlertsForm({ ...alertsForm, highVolumeAlert: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="500000"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-slate-400 mb-1">Admin Password (required)</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => settingsTab === 'budget' ? saveBudgetMutation.mutate() : saveAlertsMutation.mutate()}
                  disabled={!adminPassword || saveBudgetMutation.isPending || saveAlertsMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {(saveBudgetMutation.isPending || saveAlertsMutation.isPending) ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
