'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Activity,
  DollarSign,
  RefreshCw,
  Calendar,
  BarChart3,
  Percent,
  Edit,
  Save,
} from 'lucide-react';
import {
  api,
  ForecastResponse,
  MonteCarloResult,
  GoalProgressResult,
  SetGoalTargetsInput,
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

// Goal Progress Bar Component
function GoalProgressBar({
  label,
  current,
  target,
  projected,
  status,
  icon: Icon,
}: {
  label: string;
  current: number;
  target: number;
  projected?: number;
  status?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const projectedPercent = target > 0 && projected ? Math.min((projected / target) * 100, 150) : 0;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'AHEAD': return 'text-green-400';
      case 'ON_TRACK': return 'text-blue-400';
      case 'BEHIND': return 'text-orange-400';
      case 'FAR_BEHIND': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-white">{label}</span>
        </div>
        {status && (
          <span className={cn("text-sm font-medium", getStatusColor(status))}>
            {status.replace('_', ' ')}
          </span>
        )}
      </div>
      <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className="absolute h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
        {projected && (
          <div
            className="absolute h-full border-r-2 border-dashed border-green-400"
            style={{ width: `${Math.min(projectedPercent, 100)}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">
          {formatCurrency(current)} / {formatCurrency(target)}
        </span>
        <span className="text-slate-400">{formatPercent(percent)}</span>
      </div>
    </div>
  );
}

export default function ForecastGoalsPage() {
  const [daysAhead, setDaysAhead] = useState(30);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalInputs, setGoalInputs] = useState<Partial<SetGoalTargetsInput>>({});
  const now = new Date();

  const { data: forecastData, isLoading: forecastLoading, refetch: refetchForecast } = useQuery({
    queryKey: ['forecast', daysAhead],
    queryFn: () => api.getForecast(daysAhead),
  });

  const { data: monteCarloData, isLoading: monteCarloLoading } = useQuery({
    queryKey: ['monte-carlo', daysAhead],
    queryFn: () => api.getMonteCarloSimulation(daysAhead, 1000),
  });

  const { data: goalData, refetch: refetchGoals } = useQuery({
    queryKey: ['goal-progress'],
    queryFn: () => api.getGoalProgress(),
  });

  const saveGoalsMutation = useMutation({
    mutationFn: (targets: SetGoalTargetsInput) =>
      api.setGoalTargets(targets, prompt('Enter admin password') || ''),
    onSuccess: () => {
      toast.success('Goals updated successfully');
      setEditingGoals(false);
      refetchGoals();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update goals');
    },
  });

  const handleSaveGoals = () => {
    saveGoalsMutation.mutate({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      ...goalInputs,
    });
  };

  const isLoading = forecastLoading || monteCarloLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="h-80 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const chartData = forecastData?.forecasts.map((f) => ({
    date: format(new Date(f.date), 'MMM d'),
    expected: f.expected,
    low: f.low,
    high: f.high,
  })) || [];

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Forecast & Goals</h1>
            <p className="text-slate-400">
              Revenue forecasting and goal progress tracking
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
            <button
              onClick={() => refetchForecast()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Forecast Chart */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Revenue Forecast ({daysAhead} days)
            </h3>
            {forecastData && (
              <span className="text-sm text-slate-400">
                Methodology: {forecastData.methodology}
              </span>
            )}
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area
                  type="monotone"
                  dataKey="high"
                  stroke="transparent"
                  fill="#22c55e"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="expected"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorExpected)"
                />
                <Area
                  type="monotone"
                  dataKey="low"
                  stroke="transparent"
                  fill="#ef4444"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Month End Projections & Monte Carlo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Month End Projection */}
          {forecastData?.monthEnd && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-purple-400" />
                Month-End Projection
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Projected Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(forecastData.monthEnd.projectedRevenue)}
                  </p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">Projected Profit</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCurrency(forecastData.monthEnd.projectedProfit)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Confidence Level</span>
                  <span className="font-semibold text-white">
                    {formatPercent(forecastData.monthEnd.confidence * 100)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monte Carlo Results */}
          {monteCarloData && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-cyan-400" />
                Monte Carlo Simulation
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Best Case (P90)</span>
                  <span className="font-semibold text-green-400">
                    {formatCurrency(monteCarloData.percentiles.p90)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Most Likely (P50)</span>
                  <span className="font-semibold text-blue-400">
                    {formatCurrency(monteCarloData.percentiles.p50)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-700">
                  <span className="text-slate-400">Conservative (P10)</span>
                  <span className="font-semibold text-orange-400">
                    {formatCurrency(monteCarloData.percentiles.p10)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Standard Deviation</span>
                  <span className="font-semibold text-slate-300">
                    {formatCurrency(monteCarloData.stdDev)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Goal Progress */}
        {goalData && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-pink-400" />
                Monthly Goals - {format(now, 'MMMM yyyy')}
              </h3>
              <button
                onClick={() => editingGoals ? handleSaveGoals() : setEditingGoals(true)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  editingGoals
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                )}
              >
                {editingGoals ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {editingGoals ? 'Save' : 'Edit Goals'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <GoalProgressBar
                label="Revenue"
                current={goalData.revenue.current}
                target={goalData.revenue.target}
                projected={goalData.revenue.projected}
                status={goalData.revenue.status}
                icon={DollarSign}
              />
              <GoalProgressBar
                label="Profit"
                current={goalData.profit.current}
                target={goalData.profit.target}
                projected={goalData.profit.projected}
                status={goalData.profit.status}
                icon={TrendingUp}
              />
              <GoalProgressBar
                label="Volume"
                current={goalData.volume.current}
                target={goalData.volume.target}
                icon={BarChart3}
              />
              <GoalProgressBar
                label="New Users"
                current={goalData.newUsers.current}
                target={goalData.newUsers.target}
                icon={Target}
              />
              <GoalProgressBar
                label="Deposits"
                current={goalData.deposits.current}
                target={goalData.deposits.target}
                icon={DollarSign}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
