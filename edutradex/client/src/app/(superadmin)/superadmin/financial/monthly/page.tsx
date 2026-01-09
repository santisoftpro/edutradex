'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  RefreshCw,
  ChevronDown,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api, MonthlyReport } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as { response?: { data?: { error?: string; message?: string } }; message?: string };
    if (errorObj.response?.data?.error) {
      return errorObj.response.data.error;
    }
    if (errorObj.response?.data?.message) {
      return errorObj.response.data.message;
    }
    if (errorObj.message) {
      return errorObj.message;
    }
  }
  return 'An unexpected error occurred';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default function MonthlyReportsPage() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth() + 1); // 1-12 format
  const [generateYear, setGenerateYear] = useState(currentYear);
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch monthly reports
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ['monthly-reports', selectedYear],
    queryFn: () => api.getFinancialMonthlyReports(selectedYear),
  });

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      api.triggerMonthlyReport(month, year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      setShowGenerateModal(false);
      setMutationError(null);
      toast.success(`Monthly report for ${MONTHS[data.month - 1]} ${data.year} generated successfully`);
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      setMutationError(message);
      toast.error(`Failed to generate report: ${message}`);
    },
  });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Calculate yearly totals
  const yearlyTotals = reports?.reduce((acc, r) => ({
    totalRevenue: acc.totalRevenue + r.totalRevenue,
    netProfit: acc.netProfit + r.netProfit,
    totalVolume: acc.totalVolume + r.totalVolume,
    totalTrades: acc.totalTrades + r.totalTrades,
  }), { totalRevenue: 0, netProfit: 0, totalVolume: 0, totalTrades: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Monthly Financial Reports</h1>
          <p className="text-slate-400 mt-1">View aggregated monthly broker performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setMutationError(null);
              setShowGenerateModal(true);
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Generate Report
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Year Selector */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center gap-4">
          <label className="text-slate-400 text-sm">Year:</label>
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none px-4 py-2 pr-8 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Yearly Summary */}
      {yearlyTotals && reports && reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Year Total Revenue</p>
            <p className={cn(
              "text-2xl font-bold",
              yearlyTotals.totalRevenue >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {formatCurrency(yearlyTotals.totalRevenue)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Year Net Profit</p>
            <p className={cn(
              "text-2xl font-bold",
              yearlyTotals.netProfit >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {formatCurrency(yearlyTotals.netProfit)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Year Volume</p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(yearlyTotals.totalVolume)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Year Trades</p>
            <p className="text-2xl font-bold text-white">
              {formatNumber(yearlyTotals.totalTrades)}
            </p>
          </div>
        </div>
      )}

      {/* Monthly Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 border border-slate-700 text-center">
          <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No monthly reports found for {selectedYear}</p>
          <button
            onClick={() => {
              setMutationError(null);
              setShowGenerateModal(true);
            }}
            className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Generate First Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="bg-slate-800 rounded-lg p-5 border border-slate-700 hover:border-green-500/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {MONTHS[report.month - 1]} {report.year}
                </h3>
                {report.netProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-400" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-400" />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Revenue</span>
                  <span className={cn(
                    "font-medium",
                    report.totalRevenue >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(report.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Profit</span>
                  <span className={cn(
                    "font-bold",
                    report.netProfit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(report.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Margin</span>
                  <span className="text-white">{formatPercent(report.profitMargin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Traders</span>
                  <span className="text-white">{formatNumber(report.uniqueActiveTraders)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between text-sm">
                <span className="text-green-400">{report.profitableDays} profit days</span>
                <span className="text-red-400">{report.lossDays} loss days</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto m-4 border border-slate-700">
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {MONTHS[selectedReport.month - 1]} {selectedReport.year} Report
              </h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Total Revenue</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    selectedReport.totalRevenue >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(selectedReport.totalRevenue)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Net Profit</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    selectedReport.netProfit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(selectedReport.netProfit)}
                  </p>
                </div>
              </div>

              {/* Trading Metrics */}
              <div>
                <h3 className="text-white font-medium mb-3">Trading Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Volume</span>
                    <span className="text-white">{formatCurrency(selectedReport.totalVolume)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Trades</span>
                    <span className="text-white">{formatNumber(selectedReport.totalTrades)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Profit Margin</span>
                    <span className="text-white">{formatPercent(selectedReport.profitMargin)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Avg Win Rate</span>
                    <span className="text-white">{formatPercent(selectedReport.avgBrokerWinRate)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Avg Profit Factor</span>
                    <span className="text-white">{selectedReport.avgProfitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">ARPU</span>
                    <span className="text-white">{formatCurrency(selectedReport.arpu)}</span>
                  </div>
                </div>
              </div>

              {/* User Metrics */}
              <div>
                <h3 className="text-white font-medium mb-3">User Metrics</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Active Traders</span>
                    <span className="text-white">{formatNumber(selectedReport.uniqueActiveTraders)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">New Registrations</span>
                    <span className="text-white">{formatNumber(selectedReport.newRegistrations)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Profitable Days</span>
                    <span className="text-green-400">{selectedReport.profitableDays}</span>
                  </div>
                </div>
              </div>

              {/* Cash Flow */}
              <div>
                <h3 className="text-white font-medium mb-3">Cash Flow</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Total Deposits</span>
                    <span className="text-green-400">{formatCurrency(selectedReport.totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Total Withdrawals</span>
                    <span className="text-red-400">{formatCurrency(selectedReport.totalWithdrawals)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-700">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-md m-4 border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Generate Monthly Report</h2>
            </div>
            <div className="p-6 space-y-4">
              {mutationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{mutationError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Month</label>
                <select
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx + 1}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Year</label>
                <select
                  value={generateYear}
                  onChange={(e) => setGenerateYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setMutationError(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => generateMutation.mutate({ month: generateMonth, year: generateYear })}
                  disabled={generateMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {generateMutation.isPending ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
