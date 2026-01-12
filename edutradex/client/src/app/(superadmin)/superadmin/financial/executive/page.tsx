'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Gauge,
  PiggyBank,
  BarChart3,
  Calendar,
} from 'lucide-react';
import {
  api,
  ExecutiveSummary,
  HealthScoreResult,
  BreakEvenResult,
  RunwayResult,
  KeyRatiosResult,
  GoalProgressResult,
} from '@/lib/api';
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

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// Health Score Gauge Component
function HealthScoreGauge({ healthScore }: { healthScore: HealthScoreResult }) {
  const statusColors = {
    EXCELLENT: { ring: 'stroke-green-500', bg: 'bg-green-500/20', text: 'text-green-400' },
    GOOD: { ring: 'stroke-blue-500', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    FAIR: { ring: 'stroke-yellow-500', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    POOR: { ring: 'stroke-orange-500', bg: 'bg-orange-500/20', text: 'text-orange-400' },
    CRITICAL: { ring: 'stroke-red-500', bg: 'bg-red-500/20', text: 'text-red-400' },
  };

  const colors = statusColors[healthScore.status];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (healthScore.score / 100) * circumference;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Gauge className="h-5 w-5 text-blue-400" />
          Business Health Score
        </h3>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold uppercase",
          colors.bg,
          colors.text
        )}>
          {healthScore.status}
        </span>
      </div>

      <div className="flex items-center gap-8">
        {/* Circular Gauge */}
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              className={cn("transition-all duration-1000", colors.ring)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-3xl font-bold text-white">{healthScore.score}</span>
              <span className="text-sm text-slate-400 block">/ 100</span>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          <ScoreBreakdownItem
            label="Profit Margin"
            score={healthScore.breakdown.profitMargin.score}
            value={`${healthScore.breakdown.profitMargin.value.toFixed(1)}%`}
          />
          <ScoreBreakdownItem
            label="Cash Flow"
            score={healthScore.breakdown.cashFlow.score}
            value={formatCurrency(healthScore.breakdown.cashFlow.value)}
          />
          <ScoreBreakdownItem
            label="Volume Growth"
            score={healthScore.breakdown.volumeGrowth.score}
            value={`${healthScore.breakdown.volumeGrowth.percentChange >= 0 ? '+' : ''}${healthScore.breakdown.volumeGrowth.percentChange.toFixed(1)}%`}
          />
          <ScoreBreakdownItem
            label="Retention"
            score={healthScore.breakdown.retention.score}
            value={`${healthScore.breakdown.retention.rate.toFixed(1)}%`}
          />
          <ScoreBreakdownItem
            label="Risk Exposure"
            score={healthScore.breakdown.riskExposure.score}
            value={healthScore.breakdown.riskExposure.level}
          />
        </div>
      </div>
    </div>
  );
}

function ScoreBreakdownItem({ label, score, value }: { label: string; score: number; value: string }) {
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    if (score >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-xs text-slate-400">{label}</div>
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="w-16 text-xs text-right text-slate-300">{value}</div>
    </div>
  );
}

// Key Ratios Card
function KeyRatiosCard({ ratios }: { ratios: KeyRatiosResult }) {
  const metrics = [
    { label: 'ROI', value: formatPercent(ratios.roi), icon: TrendingUp, positive: ratios.roi > 0 },
    { label: 'Profit Factor', value: ratios.profitFactor.toFixed(2), icon: BarChart3, positive: ratios.profitFactor > 1 },
    { label: 'LTV', value: formatCurrency(ratios.lifetimeValue), icon: DollarSign, positive: true },
    { label: 'LTV/CAC', value: ratios.ltvCacRatio.toFixed(2) + 'x', icon: Activity, positive: ratios.ltvCacRatio > 3 },
  ];

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-purple-400" />
        Key Financial Ratios
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-slate-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{metric.label}</span>
              <metric.icon className={cn(
                "h-4 w-4",
                metric.positive ? "text-green-400" : "text-red-400"
              )} />
            </div>
            <span className={cn(
              "text-xl font-bold",
              metric.positive ? "text-green-400" : "text-red-400"
            )}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Break-Even Card
function BreakEvenCard({ breakEven }: { breakEven: BreakEvenResult }) {
  const progressPercent = Math.min((breakEven.currentProfit / breakEven.targetProfit) * 100, 100);

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-cyan-400" />
          Break-Even Tracking
        </h3>
        <span className={cn(
          "px-3 py-1 rounded-full text-xs font-semibold",
          breakEven.isOnTrack
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
        )}>
          {breakEven.isOnTrack ? 'On Track' : 'Behind'}
        </span>
      </div>

      <div className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Progress to Target</span>
            <span className="text-white font-medium">{progressPercent.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                breakEven.isOnTrack ? "bg-gradient-to-r from-green-500 to-cyan-500" : "bg-gradient-to-r from-red-500 to-orange-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Current</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(breakEven.currentProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Target</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(breakEven.targetProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Projected EOM</p>
            <p className={cn(
              "text-lg font-semibold",
              breakEven.projectedEOM >= breakEven.targetProfit ? "text-green-400" : "text-orange-400"
            )}>
              {formatCurrency(breakEven.projectedEOM)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400">{breakEven.daysRemaining} days remaining</span>
          </div>
          <div className="text-sm">
            <span className="text-slate-400">Need </span>
            <span className="font-semibold text-white">{formatCurrency(breakEven.dailyRateNeeded)}/day</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Runway Card
function RunwayCard({ runway }: { runway: RunwayResult }) {
  const statusConfig = {
    HEALTHY: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle },
    MODERATE: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: AlertTriangle },
    LOW: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: AlertTriangle },
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
  };

  const config = statusConfig[runway.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-amber-400" />
          Cash Runway
        </h3>
        <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", config.bg, config.color)}>
          <StatusIcon className="h-3 w-3 inline mr-1" />
          {runway.status}
        </span>
      </div>

      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <span className={cn("text-5xl font-bold", config.color)}>
            {runway.runwayMonths.toFixed(1)}
          </span>
          <span className="text-xl text-slate-400 ml-2">months</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
        <div>
          <p className="text-xs text-slate-400 mb-1">Available Cash</p>
          <p className="text-lg font-semibold text-white">{formatCurrency(runway.availableCash)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-1">Monthly Burn Rate</p>
          <p className="text-lg font-semibold text-red-400">{formatCurrency(runway.monthlyBurnRate)}</p>
        </div>
      </div>
    </div>
  );
}

// Goal Progress Card
function GoalProgressCard({ goals }: { goals: GoalProgressResult }) {
  const goalItems = [
    { label: 'Revenue', ...goals.revenue, icon: DollarSign },
    { label: 'Profit', ...goals.profit, icon: TrendingUp },
    { label: 'Volume', ...goals.volume, icon: Activity },
    { label: 'New Users', ...goals.newUsers, icon: Target },
    { label: 'Deposits', ...goals.deposits, icon: PiggyBank },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AHEAD': return 'text-green-400';
      case 'ON_TRACK': return 'text-blue-400';
      case 'BEHIND': return 'text-orange-400';
      case 'FAR_BEHIND': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-pink-400" />
        Monthly Goal Progress
      </h3>

      <div className="space-y-4">
        {goalItems.map((goal) => (
          <div key={goal.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <goal.icon className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">{goal.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
                </span>
                {'status' in goal && (
                  <span className={cn("text-xs font-medium", getStatusColor(goal.status))}>
                    {goal.status?.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  goal.percentComplete >= 100 ? "bg-green-500" :
                  goal.percentComplete >= 75 ? "bg-blue-500" :
                  goal.percentComplete >= 50 ? "bg-yellow-500" :
                  goal.percentComplete >= 25 ? "bg-orange-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(goal.percentComplete, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExecutiveSummaryPage() {
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['executive-summary'],
    queryFn: () => api.getExecutiveSummary(),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: goals } = useQuery({
    queryKey: ['goal-progress'],
    queryFn: () => api.getGoalProgress(),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-slate-800 rounded-lg" />
              <div className="h-64 bg-slate-800 rounded-lg" />
              <div className="h-64 bg-slate-800 rounded-lg" />
              <div className="h-64 bg-slate-800 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load data</h2>
          <p className="text-slate-400 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Executive Summary</h1>
            <p className="text-slate-400">
              Business health and performance overview as of {format(new Date(), 'PPP')}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Health Score - Full Width on Large */}
          <div className="lg:col-span-2">
            <HealthScoreGauge healthScore={summary.healthScore} />
          </div>

          {/* Key Ratios */}
          <KeyRatiosCard ratios={summary.keyRatios} />

          {/* Break-Even Tracking */}
          <BreakEvenCard breakEven={summary.breakEven} />

          {/* Runway */}
          <RunwayCard runway={summary.runway} />

          {/* Goal Progress */}
          {goals && <GoalProgressCard goals={goals} />}
        </div>

        {/* Last Updated Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            <Calendar className="h-3 w-3 inline mr-1" />
            Last updated: {format(new Date(summary.generatedAt), 'PPpp')}
          </p>
        </div>
      </div>
    </div>
  );
}
