'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  RefreshCw,
  Calendar,
  BarChart3,
  Users,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { api, FinancialSummary, RealTimeMetrics, SchedulerStatus, AlertThresholds } from '@/lib/api';
import { cn } from '@/lib/utils';

// Exposure Gauge Component
function ExposureGauge({
  currentExposure,
  maxPayout,
  alertThreshold,
  dailyLossLimit
}: {
  currentExposure: number;
  maxPayout: number;
  alertThreshold: number;
  dailyLossLimit: number;
}) {
  // Calculate max scale based on the highest relevant value
  const maxScale = Math.max(alertThreshold * 1.5, maxPayout * 1.2, currentExposure * 1.2, 50000);

  // Calculate percentages for the gauge
  const exposurePercent = Math.min((currentExposure / maxScale) * 100, 100);
  const payoutPercent = Math.min((maxPayout / maxScale) * 100, 100);
  const alertPercent = Math.min((alertThreshold / maxScale) * 100, 100);
  const lossLimitPercent = Math.min((dailyLossLimit / maxScale) * 100, 100);

  // Determine risk level
  const riskLevel = currentExposure >= alertThreshold
    ? 'critical'
    : currentExposure >= alertThreshold * 0.7
      ? 'warning'
      : currentExposure >= alertThreshold * 0.4
        ? 'moderate'
        : 'safe';

  const riskColors = {
    safe: { bg: 'bg-green-500', text: 'text-green-400', glow: 'shadow-green-500/50' },
    moderate: { bg: 'bg-yellow-500', text: 'text-yellow-400', glow: 'shadow-yellow-500/50' },
    warning: { bg: 'bg-orange-500', text: 'text-orange-400', glow: 'shadow-orange-500/50' },
    critical: { bg: 'bg-red-500', text: 'text-red-400', glow: 'shadow-red-500/50' },
  };

  const colors = riskColors[riskLevel];

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Real-Time Risk Exposure</h3>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold uppercase",
          riskLevel === 'safe' && "bg-green-500/20 text-green-400",
          riskLevel === 'moderate' && "bg-yellow-500/20 text-yellow-400",
          riskLevel === 'warning' && "bg-orange-500/20 text-orange-400",
          riskLevel === 'critical' && "bg-red-500/20 text-red-400 animate-pulse"
        )}>
          {riskLevel}
        </span>
      </div>

      {/* Main Gauge Bar */}
      <div className="relative h-12 bg-slate-900 rounded-lg overflow-hidden mb-4">
        {/* Background gradient zones */}
        <div className="absolute inset-0 flex">
          <div className="h-full bg-green-900/30" style={{ width: `${alertPercent * 0.4}%` }} />
          <div className="h-full bg-yellow-900/30" style={{ width: `${alertPercent * 0.3}%` }} />
          <div className="h-full bg-orange-900/30" style={{ width: `${alertPercent * 0.3}%` }} />
          <div className="h-full bg-red-900/30 flex-1" />
        </div>

        {/* Alert threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
          style={{ left: `${alertPercent}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-red-400 whitespace-nowrap">
            Alert
          </div>
        </div>

        {/* Daily loss limit marker */}
        {dailyLossLimit > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20 border-dashed"
            style={{ left: `${lossLimitPercent}%` }}
          >
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-amber-400 whitespace-nowrap">
              Limit
            </div>
          </div>
        )}

        {/* Max payout indicator */}
        <div
          className="absolute top-1 bottom-1 bg-purple-500/40 border-r-2 border-purple-400 z-10"
          style={{ width: `${payoutPercent}%` }}
        />

        {/* Current exposure fill */}
        <div
          className={cn(
            "absolute top-2 bottom-2 rounded transition-all duration-500",
            colors.bg,
            "shadow-lg",
            colors.glow
          )}
          style={{ width: `${exposurePercent}%` }}
        />

        {/* Exposure value label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg drop-shadow-lg">
            {formatCurrency(currentExposure)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        <div className="flex items-center gap-2">
          <div className={cn("w-3 h-3 rounded", colors.bg)} />
          <div>
            <p className="text-xs text-slate-400">Current Exposure</p>
            <p className={cn("text-sm font-semibold", colors.text)}>
              {formatCurrency(currentExposure)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <div>
            <p className="text-xs text-slate-400">Max Payout</p>
            <p className="text-sm font-semibold text-purple-400">
              {formatCurrency(maxPayout)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <div>
            <p className="text-xs text-slate-400">Alert Threshold</p>
            <p className="text-sm font-semibold text-red-400">
              {formatCurrency(alertThreshold)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500" />
          <div>
            <p className="text-xs text-slate-400">Daily Loss Limit</p>
            <p className="text-sm font-semibold text-amber-400">
              {formatCurrency(dailyLossLimit)}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Zones Indicator */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-2">Risk Zones</p>
        <div className="flex gap-1 h-2 rounded overflow-hidden">
          <div className="bg-green-500 flex-[4]" title="Safe (0-40%)" />
          <div className="bg-yellow-500 flex-[3]" title="Moderate (40-70%)" />
          <div className="bg-orange-500 flex-[3]" title="Warning (70-100%)" />
          <div className="bg-red-500 flex-[5]" title="Critical (100%+)" />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0%</span>
          <span>40%</span>
          <span>70%</span>
          <span>100%</span>
          <span>Alert</span>
        </div>
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
  }
  return 'An unexpected error occurred';
}

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

export default function FinancialDashboardPage() {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update time only on client to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch financial summary
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['financial-summary'],
    queryFn: () => api.getFinancialSummary(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch scheduler status
  const { data: schedulerStatus } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: () => api.getSchedulerStatus(),
    refetchInterval: 30000,
  });

  // Fetch alert thresholds for gauge
  const { data: alertThresholds } = useQuery({
    queryKey: ['alert-thresholds'],
    queryFn: () => api.getAlertThresholds(),
    staleTime: 60000,
  });

  // Trigger daily snapshot
  const triggerSnapshotMutation = useMutation({
    mutationFn: () => api.triggerDailySnapshot(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      toast.success('Daily snapshot generated successfully');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(`Failed to generate snapshot: ${message}`);
    },
  });

  const handleGenerateSnapshot = async () => {
    setIsGenerating(true);
    try {
      await triggerSnapshotMutation.mutateAsync();
    } catch {
      // Error already handled in mutation
    } finally {
      setIsGenerating(false);
    }
  };

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
      </div>
    );
  }

  const today = summary?.today;
  const yesterday = summary?.yesterday;
  const thisMonth = summary?.thisMonth;
  const ytd = summary?.yearToDate;

  // Calculate change percentages
  const revenueChange = yesterday?.grossTradingRevenue
    ? ((today?.todayRevenue || 0) - yesterday.grossTradingRevenue) / Math.abs(yesterday.grossTradingRevenue) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Dashboard</h1>
          <p className="text-slate-400 mt-1">Broker P&L Overview and Real-Time Metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {schedulerStatus?.running && (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Scheduler Active
            </span>
          )}
          <button
            onClick={() => refetchSummary()}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {today?.isAlertActive && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-400">Financial Alert Active</p>
            <p className="text-red-300 text-sm">{today.alertMessage}</p>
          </div>
        </div>
      )}

      {/* Real-Time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's P&L */}
        <div className={cn(
          "bg-slate-800 rounded-lg p-5 border",
          (today?.currentDailyPL || 0) >= 0 ? "border-green-500/30" : "border-red-500/30"
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Today's P&L</span>
            {(today?.currentDailyPL || 0) >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
          </div>
          <p className={cn(
            "text-2xl font-bold",
            (today?.currentDailyPL || 0) >= 0 ? "text-green-400" : "text-red-400"
          )}>
            {formatCurrency(today?.currentDailyPL || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Updated: {currentTime || '--:--:--'}
          </p>
        </div>

        {/* Today's Volume */}
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Today's Volume</span>
            <BarChart3 className="h-5 w-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(today?.todayVolume || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatNumber(today?.todayTrades || 0)} trades
          </p>
        </div>

        {/* Open Exposure */}
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Net Exposure</span>
            <Activity className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(Math.abs(today?.netExposure || 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatNumber(today?.totalOpenTrades || 0)} open trades
          </p>
        </div>

        {/* Max Potential Payout */}
        <div className="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Max Payout Risk</span>
            <DollarSign className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(today?.maxPotentialPayout || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            If all trades win
          </p>
        </div>
      </div>

      {/* Real-Time Exposure Gauge */}
      <ExposureGauge
        currentExposure={Math.abs(today?.netExposure || 0)}
        maxPayout={today?.maxPotentialPayout || 0}
        alertThreshold={alertThresholds?.exposureAlertThreshold || 50000}
        dailyLossLimit={alertThresholds?.dailyLossLimit || 25000}
      />

      {/* Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Yesterday */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold text-white">Yesterday</h3>
          </div>
          {yesterday ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Revenue</span>
                <span className={cn(
                  "font-medium",
                  yesterday.grossTradingRevenue >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(yesterday.grossTradingRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Volume</span>
                <span className="text-white">{formatCurrency(yesterday.totalTradeVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Trades</span>
                <span className="text-white">{formatNumber(yesterday.totalTrades)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Broker Win Rate</span>
                <span className="text-white">{formatPercent(yesterday.brokerWinRate)}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data available</p>
          )}
        </div>

        {/* This Month */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">This Month</h3>
          </div>
          {thisMonth ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Revenue</span>
                <span className={cn(
                  "font-medium",
                  thisMonth.totalRevenue >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(thisMonth.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Profit</span>
                <span className={cn(
                  "font-medium",
                  thisMonth.netProfit >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(thisMonth.netProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Volume</span>
                <span className="text-white">{formatCurrency(thisMonth.totalVolume)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Days Reported</span>
                <span className="text-white">{thisMonth.daysReported} days</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data available</p>
          )}
        </div>

        {/* Year to Date */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <h3 className="font-semibold text-white">Year to Date</h3>
          </div>
          {ytd ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Revenue</span>
                <span className={cn(
                  "font-medium",
                  ytd.totalRevenue >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(ytd.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Net Profit</span>
                <span className={cn(
                  "font-medium",
                  ytd.netProfit >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(ytd.netProfit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Volume</span>
                <span className="text-white">{formatCurrency(ytd.totalVolume)}</span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Today's Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Deposits & Withdrawals */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="font-semibold text-white mb-4">Today's Cash Flow</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <ArrowUpRight className="h-5 w-5 text-green-400" />
                <span className="text-slate-300">Deposits</span>
              </div>
              <span className="text-green-400 font-semibold">
                {formatCurrency(today?.todayDeposits || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="h-5 w-5 text-red-400" />
                <span className="text-slate-300">Withdrawals</span>
              </div>
              <span className="text-red-400 font-semibold">
                {formatCurrency(today?.todayWithdrawals || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <span className="text-slate-300">Net Cash Flow</span>
              <span className={cn(
                "font-semibold",
                ((today?.todayDeposits || 0) - (today?.todayWithdrawals || 0)) >= 0
                  ? "text-green-400"
                  : "text-red-400"
              )}>
                {formatCurrency((today?.todayDeposits || 0) - (today?.todayWithdrawals || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Affiliate Commissions */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="font-semibold text-white mb-4">Today's Affiliate Costs</h3>
          <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-amber-400" />
              <div>
                <p className="text-white font-medium">Commissions Paid</p>
                <p className="text-slate-400 text-sm">All affiliate payouts today</p>
              </div>
            </div>
            <span className="text-amber-400 font-bold text-xl">
              {formatCurrency(today?.todayAffiliateCommissions || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerateSnapshot}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            Generate Today's Snapshot
          </button>
          <a
            href="/superadmin/financial/daily"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            View Daily Reports
          </a>
          <a
            href="/superadmin/financial/monthly"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Calendar className="h-4 w-4" />
            View Monthly Reports
          </a>
          <a
            href="/superadmin/financial/users"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Users className="h-4 w-4" />
            Manage User Types
          </a>
        </div>
      </div>

      {/* Scheduler Status */}
      {schedulerStatus && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="font-semibold text-white mb-4">Scheduler Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm">Real-Time Metrics</p>
              <p className={cn(
                "font-medium",
                schedulerStatus.intervals.realTimeMetrics ? "text-green-400" : "text-red-400"
              )}>
                {schedulerStatus.intervals.realTimeMetrics ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm">Daily Snapshots</p>
              <p className={cn(
                "font-medium",
                schedulerStatus.intervals.dailySnapshot ? "text-green-400" : "text-red-400"
              )}>
                {schedulerStatus.intervals.dailySnapshot ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm">Monthly Reports</p>
              <p className={cn(
                "font-medium",
                schedulerStatus.intervals.monthlyReport ? "text-green-400" : "text-red-400"
              )}>
                {schedulerStatus.intervals.monthlyReport ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <p className="text-slate-400 text-sm">Midnight Reset</p>
              <p className={cn(
                "font-medium",
                schedulerStatus.intervals.midnightReset ? "text-green-400" : "text-red-400"
              )}>
                {schedulerStatus.intervals.midnightReset ? 'Scheduled' : 'Not Scheduled'}
              </p>
            </div>
          </div>
          {schedulerStatus.lastSnapshotDate && (
            <p className="text-slate-500 text-sm mt-4">
              Last snapshot: {schedulerStatus.lastSnapshotDate}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
