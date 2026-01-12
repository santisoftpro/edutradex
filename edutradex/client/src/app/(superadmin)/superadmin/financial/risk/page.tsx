'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  Shield,
  Users,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api, ConcentrationRiskResult } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

const RISK_COLORS = {
  LOW: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-400',
};

const RISK_BG = {
  LOW: 'bg-green-500/20',
  MEDIUM: 'bg-yellow-500/20',
  HIGH: 'bg-orange-500/20',
  CRITICAL: 'bg-red-500/20',
};

export default function ConcentrationRiskPage() {
  const { data: riskData, isLoading, refetch } = useQuery({
    queryKey: ['concentration-risk'],
    queryFn: () => api.getConcentrationRisk(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded-lg" />
              ))}
            </div>
            <div className="h-96 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!riskData) {
    return null;
  }

  const pieData = riskData.topUsers.slice(0, 5).map((user, index) => ({
    name: user.userName || user.userEmail.split('@')[0],
    value: user.revenuePercent,
    color: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'][index],
  }));

  // Add "Others" slice
  const topFivePercent = pieData.reduce((sum, item) => sum + item.value, 0);
  if (topFivePercent < 100) {
    pieData.push({
      name: 'Others',
      value: 100 - topFivePercent,
      color: '#64748b',
    });
  }

  // Determine overall risk level based on HHI
  const hhi = riskData.metrics.herfindahlIndex;
  const overallRisk = hhi > 2500 ? 'HIGH' : hhi > 1500 ? 'MEDIUM' : 'LOW';

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Concentration Risk</h1>
            <p className="text-slate-400">
              Monitor user concentration and dependency risks
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Risk Alerts */}
        {riskData.alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {riskData.alerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3"
              >
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-200">{alert.message}</span>
                <span className="ml-auto text-sm text-red-400">
                  {formatPercent(alert.actual)} (threshold: {formatPercent(alert.threshold)})
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">HHI Index</p>
                <p className={cn(
                  "text-3xl font-bold",
                  overallRisk === 'LOW' ? 'text-green-400' :
                  overallRisk === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {riskData.metrics.herfindahlIndex.toFixed(0)}
                </p>
              </div>
              <Shield className={cn(
                "h-10 w-10 opacity-50",
                overallRisk === 'LOW' ? 'text-green-400' :
                overallRisk === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
              )} />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {hhi < 1500 ? 'Low concentration' : hhi < 2500 ? 'Moderate concentration' : 'High concentration'}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Top 1% Share</p>
                <p className="text-2xl font-bold text-blue-400">
                  {formatPercent(riskData.metrics.top1Percent)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Top 5% Share</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatPercent(riskData.metrics.top5Percent)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Top 10% Share</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {formatPercent(riskData.metrics.top10Percent)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">Revenue Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, 'Share']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Users Table */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
                Top Users by Concentration
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Volume</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Volume %</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Revenue %</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {riskData.topUsers.map((user) => (
                    <tr key={user.userId} className="hover:bg-slate-700/50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-white">{user.userName || 'Unknown'}</p>
                          <p className="text-sm text-slate-400">{user.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-slate-300">
                        {formatCurrency(user.volume)}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-300">
                        {formatPercent(user.volumePercent)}
                      </td>
                      <td className="px-4 py-4 text-right text-green-400">
                        {formatCurrency(user.revenue)}
                      </td>
                      <td className="px-4 py-4 text-right text-green-400">
                        {formatPercent(user.revenuePercent)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            RISK_BG[user.riskLevel],
                            RISK_COLORS[user.riskLevel]
                          )}>
                            {user.riskLevel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* HHI Explanation */}
        <div className="mt-6 bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="font-semibold text-white mb-3">About Herfindahl-Hirschman Index (HHI)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-400 font-medium">HHI &lt; 1,500</p>
              <p className="text-slate-400 mt-1">Low concentration - diversified user base</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-yellow-400 font-medium">HHI 1,500 - 2,500</p>
              <p className="text-slate-400 mt-1">Moderate concentration - some dependency</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-red-400 font-medium">HHI &gt; 2,500</p>
              <p className="text-slate-400 mt-1">High concentration - significant risk</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
