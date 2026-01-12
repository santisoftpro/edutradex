'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  UserMinus,
  TrendingDown,
  TrendingUp,
  Users,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { api, ChurnMetrics } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default function ChurnTrackingPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: churnData, isLoading, refetch } = useQuery({
    queryKey: ['churn-metrics', month, year],
    queryFn: () => api.getChurnMetrics(month, year),
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
            <div className="h-80 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!churnData) {
    return null;
  }

  const isLowChurn = churnData.churnRate < 5;

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Churn Tracking</h1>
            <p className="text-slate-400">
              Monitor user churn rates and identify at-risk segments
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Churn Rate</p>
                <p className={cn(
                  "text-3xl font-bold",
                  isLowChurn ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercent(churnData.churnRate)}
                </p>
              </div>
              {isLowChurn ? (
                <CheckCircle className="h-10 w-10 text-green-400/50" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-red-400/50" />
              )}
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <UserMinus className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Churned Users</p>
                <p className="text-2xl font-bold text-red-400">
                  {churnData.churnedUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Users</p>
                <p className="text-2xl font-bold text-blue-400">
                  {churnData.totalUsers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Reactivation Rate</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatPercent(churnData.reactivationRate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Churn Trend Chart */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-400" />
            Churn Rate Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={churnData.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatPercent(value), 'Churn Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="churnRate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn by Segment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By User Type */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">Churn by User Type</h3>
            <div className="space-y-3">
              {Object.entries(churnData.churnBySegment.byUserType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-slate-300">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${(count / churnData.churnedUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-red-400 font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Deposit Tier */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h3 className="font-semibold text-white mb-4">Churn by Deposit Tier</h3>
            <div className="space-y-3">
              {Object.entries(churnData.churnBySegment.byDepositTier).map(([tier, count]) => (
                <div key={tier} className="flex items-center justify-between">
                  <span className="text-slate-300">{tier}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${(count / churnData.churnedUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-orange-400 font-medium w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
