'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight, TrendingUp, TrendingDown, Scale,
  Calendar, RefreshCw, Download,
} from 'lucide-react';
import { api, DateRangeComparison } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

const METRIC_LABELS: Record<string, string> = {
  totalRevenue: 'Total Revenue',
  totalVolume: 'Trading Volume',
  totalTrades: 'Total Trades',
  totalDeposits: 'Total Deposits',
  totalWithdrawals: 'Total Withdrawals',
  netProfit: 'Net Profit',
  avgWinRate: 'Avg Win Rate',
};

const PRESETS = [
  { label: 'This Week vs Last Week', getValue: () => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const thisWeekEnd = new Date(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
    return {
      range1Start: lastWeekStart.toISOString().split('T')[0],
      range1End: lastWeekEnd.toISOString().split('T')[0],
      range2Start: thisWeekStart.toISOString().split('T')[0],
      range2End: thisWeekEnd.toISOString().split('T')[0],
    };
  }},
  { label: 'This Month vs Last Month', getValue: () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      range1Start: lastMonthStart.toISOString().split('T')[0],
      range1End: lastMonthEnd.toISOString().split('T')[0],
      range2Start: thisMonthStart.toISOString().split('T')[0],
      range2End: thisMonthEnd.toISOString().split('T')[0],
    };
  }},
  { label: 'Last 7 Days vs Previous 7 Days', getValue: () => {
    const now = new Date();
    const range2End = new Date(now);
    const range2Start = new Date(now);
    range2Start.setDate(range2Start.getDate() - 6);
    const range1End = new Date(range2Start);
    range1End.setDate(range1End.getDate() - 1);
    const range1Start = new Date(range1End);
    range1Start.setDate(range1Start.getDate() - 6);
    return {
      range1Start: range1Start.toISOString().split('T')[0],
      range1End: range1End.toISOString().split('T')[0],
      range2Start: range2Start.toISOString().split('T')[0],
      range2End: range2End.toISOString().split('T')[0],
    };
  }},
  { label: 'Last 30 Days vs Previous 30 Days', getValue: () => {
    const now = new Date();
    const range2End = new Date(now);
    const range2Start = new Date(now);
    range2Start.setDate(range2Start.getDate() - 29);
    const range1End = new Date(range2Start);
    range1End.setDate(range1End.getDate() - 1);
    const range1Start = new Date(range1End);
    range1Start.setDate(range1Start.getDate() - 29);
    return {
      range1Start: range1Start.toISOString().split('T')[0],
      range1End: range1End.toISOString().split('T')[0],
      range2Start: range2Start.toISOString().split('T')[0],
      range2End: range2End.toISOString().split('T')[0],
    };
  }},
];

export default function ComparisonPage() {
  const [range1Start, setRange1Start] = useState('');
  const [range1End, setRange1End] = useState('');
  const [range2Start, setRange2Start] = useState('');
  const [range2End, setRange2End] = useState('');
  const [comparison, setComparison] = useState<DateRangeComparison | null>(null);

  const compareMutation = useMutation({
    mutationFn: () => api.compareDateRanges(range1Start, range1End, range2Start, range2End),
    onSuccess: (data) => {
      setComparison(data);
      toast.success('Comparison complete');
    },
    onError: () => toast.error('Failed to compare ranges'),
  });

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const values = preset.getValue();
    setRange1Start(values.range1Start);
    setRange1End(values.range1End);
    setRange2Start(values.range2Start);
    setRange2End(values.range2End);
  };

  const exportComparison = () => {
    if (!comparison) return;
    const data = Object.keys(comparison.comparison).map((key) => ({
      metric: METRIC_LABELS[key] || key,
      range1Value: comparison.range1.metrics[key],
      range2Value: comparison.range2.metrics[key],
      difference: comparison.comparison[key].diff,
      percentChange: comparison.comparison[key].percentChange,
    }));
    const headers = ['Metric', 'Range 1', 'Range 2', 'Difference', '% Change'];
    const csv = [
      `Comparison: ${comparison.range1.start} to ${comparison.range1.end} vs ${comparison.range2.start} to ${comparison.range2.end}`,
      '',
      headers.join(','),
      ...data.map(row => [row.metric, row.range1Value, row.range2Value, row.difference, row.percentChange.toFixed(2) + '%'].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'date-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported comparison.csv');
  };

  const isValidRange = range1Start && range1End && range2Start && range2End;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Date Range Comparison</h1>
          <p className="text-slate-400 mt-1">Compare financial metrics between two time periods</p>
        </div>
        {comparison && (
          <button
            onClick={exportComparison}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <p className="text-slate-400 text-sm mb-3">Quick Presets:</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Inputs */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Range 1 */}
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              Period 1 (Baseline)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={range1Start}
                  onChange={(e) => setRange1Start(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={range1End}
                  onChange={(e) => setRange1End(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* Range 2 */}
          <div className="p-4 bg-slate-700/50 rounded-lg">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-400" />
              Period 2 (Comparison)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={range2Start}
                  onChange={(e) => setRange2Start(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={range2End}
                  onChange={(e) => setRange2End(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => compareMutation.mutate()}
            disabled={!isValidRange || compareMutation.isPending}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {compareMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <Scale className="h-4 w-4" />
                Compare Periods
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Revenue Change</p>
              <div className="flex items-center gap-2">
                {comparison.comparison.totalRevenue.percentChange >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
                <span className={cn(
                  "text-2xl font-bold",
                  comparison.comparison.totalRevenue.percentChange >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercent(comparison.comparison.totalRevenue.percentChange)}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {formatCurrency(comparison.comparison.totalRevenue.diff)} difference
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Profit Change</p>
              <div className="flex items-center gap-2">
                {comparison.comparison.netProfit.percentChange >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
                <span className={cn(
                  "text-2xl font-bold",
                  comparison.comparison.netProfit.percentChange >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercent(comparison.comparison.netProfit.percentChange)}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {formatCurrency(comparison.comparison.netProfit.diff)} difference
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
              <p className="text-slate-400 text-sm mb-2">Volume Change</p>
              <div className="flex items-center gap-2">
                {comparison.comparison.totalVolume.percentChange >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
                <span className={cn(
                  "text-2xl font-bold",
                  comparison.comparison.totalVolume.percentChange >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatPercent(comparison.comparison.totalVolume.percentChange)}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                {formatCurrency(comparison.comparison.totalVolume.diff)} difference
              </p>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Detailed Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-3 px-4">Metric</th>
                    <th className="text-right py-3 px-4">
                      <span className="text-blue-400">Period 1</span>
                      <span className="text-xs block text-slate-500">{comparison.range1.start} to {comparison.range1.end}</span>
                    </th>
                    <th className="text-center py-3 px-4"></th>
                    <th className="text-right py-3 px-4">
                      <span className="text-green-400">Period 2</span>
                      <span className="text-xs block text-slate-500">{comparison.range2.start} to {comparison.range2.end}</span>
                    </th>
                    <th className="text-right py-3 px-4">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(comparison.comparison).map((key) => {
                    const val1 = comparison.range1.metrics[key];
                    const val2 = comparison.range2.metrics[key];
                    const change = comparison.comparison[key];
                    const isCurrency = ['totalRevenue', 'totalVolume', 'totalDeposits', 'totalWithdrawals', 'netProfit'].includes(key);
                    const isPercent = key === 'avgWinRate';

                    return (
                      <tr key={key} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                        <td className="py-3 px-4 text-white font-medium">{METRIC_LABELS[key] || key}</td>
                        <td className="py-3 px-4 text-right text-blue-400">
                          {isCurrency ? formatCurrency(val1) : isPercent ? `${val1.toFixed(1)}%` : formatNumber(val1)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <ArrowRight className="h-4 w-4 text-slate-500 inline" />
                        </td>
                        <td className="py-3 px-4 text-right text-green-400">
                          {isCurrency ? formatCurrency(val2) : isPercent ? `${val2.toFixed(1)}%` : formatNumber(val2)}
                        </td>
                        <td className={cn(
                          "py-3 px-4 text-right font-medium",
                          change.percentChange >= 0 ? "text-green-400" : "text-red-400"
                        )}>
                          <div className="flex items-center justify-end gap-1">
                            {change.percentChange >= 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            {formatPercent(change.percentChange)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!comparison && (
        <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
          <Scale className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Select two date ranges and click "Compare Periods" to see the comparison</p>
        </div>
      )}
    </div>
  );
}
