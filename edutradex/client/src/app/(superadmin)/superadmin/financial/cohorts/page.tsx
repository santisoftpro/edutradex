'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Users,
  TrendingUp,
  Calendar,
  RefreshCw,
  DollarSign,
  Activity,
  BarChart3,
} from 'lucide-react';
import { api, CohortAnalysisResult } from '@/lib/api';
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
  return `${value.toFixed(1)}%`;
}

// Retention Heatmap Cell
function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0;
  const getColor = (intensity: number) => {
    if (intensity >= 0.8) return 'bg-green-500';
    if (intensity >= 0.6) return 'bg-green-600';
    if (intensity >= 0.4) return 'bg-green-700';
    if (intensity >= 0.2) return 'bg-green-800';
    return 'bg-green-900';
  };

  return (
    <td className={cn(
      "px-3 py-2 text-center text-sm font-medium text-white",
      getColor(intensity)
    )}>
      {formatPercent(value)}
    </td>
  );
}

export default function CohortAnalysisPage() {
  const [months, setMonths] = useState(12);

  const { data: cohortData, isLoading, refetch } = useQuery({
    queryKey: ['cohort-analysis', months],
    queryFn: () => api.getCohortAnalysis({ months }),
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateCohorts(),
    onSuccess: (result) => {
      toast.success(`Updated ${result.updated} cohorts, created ${result.created} new`);
      refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update cohorts');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="h-96 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!cohortData) {
    return null;
  }

  const maxRetention = Math.max(
    ...cohortData.cohorts.flatMap((c) => [
      c.retention.month1,
      c.retention.month2,
      c.retention.month3,
      c.retention.month6,
      c.retention.month12,
    ])
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Cohort Analysis</h1>
            <p className="text-slate-400">
              User retention and lifetime value by signup cohort
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value={6}>Last 6 months</option>
              <option value={12}>Last 12 months</option>
              <option value={24}>Last 24 months</option>
            </select>
            <button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", updateMutation.isPending && "animate-spin")} />
              Update Cohorts
            </button>
          </div>
        </div>

        {/* Average Retention Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Cohorts</p>
                <p className="text-2xl font-bold text-white">{cohortData.cohorts.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Month 1 Retention</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatPercent(cohortData.averageRetention.month1)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Month 3 Retention</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatPercent(cohortData.averageRetention.month3)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Month 6 Retention</p>
                <p className="text-2xl font-bold text-purple-400">
                  {formatPercent(cohortData.averageRetention.month6)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Retention Heatmap */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden mb-6">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              Retention Heatmap
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Percentage of users active in each month after signup
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cohort</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Size</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Month 1</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Month 2</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Month 3</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Month 6</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Month 12</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {cohortData.cohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-white">
                      {cohort.cohortMonth}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">
                      {cohort.cohortSize.toLocaleString()}
                    </td>
                    <HeatmapCell value={cohort.retention.month1} max={maxRetention} />
                    <HeatmapCell value={cohort.retention.month2} max={maxRetention} />
                    <HeatmapCell value={cohort.retention.month3} max={maxRetention} />
                    <HeatmapCell value={cohort.retention.month6} max={maxRetention} />
                    <HeatmapCell value={cohort.retention.month12} max={maxRetention} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue by Cohort */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-400" />
              Revenue by Cohort
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Cohort</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Month 1 Rev</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">3-Month Cumulative</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">6-Month Cumulative</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">LTV</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Deposit Frequency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {cohortData.cohorts.map((cohort) => (
                  <tr key={cohort.cohortMonth} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-white">{cohort.cohortMonth}</td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {formatCurrency(cohort.revenue.month1)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {formatCurrency(cohort.revenue.cumulative3)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {formatCurrency(cohort.revenue.cumulative6)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-400">
                      {formatCurrency(cohort.revenue.ltv)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {cohort.depositFrequency.toFixed(1)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
