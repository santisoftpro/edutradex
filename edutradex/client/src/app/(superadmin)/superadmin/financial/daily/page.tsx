'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api, DailySnapshot } from '@/lib/api';
import { cn } from '@/lib/utils';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.message === 'string') return err.message;
    if (typeof err.error === 'string') return err.error;
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.error === 'string') return data.error;
      }
    }
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

export default function DailySnapshotsPage() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DailySnapshot | null>(null);
  const [showCostsModal, setShowCostsModal] = useState(false);
  const [operatingCosts, setOperatingCosts] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  // Fetch daily snapshots
  const { data: snapshotsData, isLoading, refetch } = useQuery({
    queryKey: ['daily-snapshots', dateFrom, dateTo, page],
    queryFn: () => api.getFinancialDailySnapshots({
      from: dateFrom,
      to: dateTo,
      page,
      limit: 15,
      sortOrder: 'desc',
    }),
  });

  // Set operating costs mutation
  const setCostsMutation = useMutation({
    mutationFn: ({ date, costs, password }: { date: string; costs: number; password: string }) =>
      api.setOperatingCosts(date, costs, password),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-snapshots'] });
      setShowCostsModal(false);
      setOperatingCosts('');
      setAdminPassword('');
      setMutationError(null);
      toast.success(`Operating costs updated successfully for ${selectedSnapshot?.date ? format(new Date(selectedSnapshot.date), 'MMM dd, yyyy') : 'selected date'}`);
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      setMutationError(message);
      toast.error(message);
    },
  });

  // Trigger snapshot mutation
  const triggerSnapshotMutation = useMutation({
    mutationFn: (date?: string) => api.triggerDailySnapshot(date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-snapshots'] });
      toast.success('Daily snapshot generated successfully');
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      toast.error(`Failed to generate snapshot: ${message}`);
    },
  });

  const handleSetCosts = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSnapshot || !operatingCosts || !adminPassword) return;
    setMutationError(null);

    setCostsMutation.mutate({
      date: format(new Date(selectedSnapshot.date), 'yyyy-MM-dd'),
      costs: parseFloat(operatingCosts),
      password: adminPassword,
    });
  };

  const openCostsModal = (snapshot: DailySnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowCostsModal(true);
    setOperatingCosts(snapshot.operatingCosts.toString());
    setMutationError(null);
  };

  const closeCostsModal = () => {
    setShowCostsModal(false);
    setOperatingCosts('');
    setAdminPassword('');
    setMutationError(null);
  };

  const snapshots = snapshotsData?.data || [];
  const pagination = snapshotsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Financial Reports</h1>
          <p className="text-slate-400 mt-1">View and manage daily broker P&L snapshots</p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-sm">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-sm">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => {
                setDateFrom(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
                setDateTo(format(new Date(), 'yyyy-MM-dd'));
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                setDateFrom(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                setDateTo(format(new Date(), 'yyyy-MM-dd'));
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
                setDateTo(format(new Date(), 'yyyy-MM-dd'));
                setPage(1);
              }}
              className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Snapshots Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No snapshots found for this period</p>
            <button
              onClick={() => triggerSnapshotMutation.mutate(undefined)}
              className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Generate Today's Snapshot
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Revenue</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Volume</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Trades</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Win Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Op. Costs</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Profit</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {snapshots.map((snapshot) => (
                  <tr
                    key={snapshot.id}
                    className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="text-white font-medium">
                          {format(new Date(snapshot.date), 'MMM dd, yyyy')}
                        </span>
                        {snapshot.isFinalized && (
                          <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                            Final
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "px-4 py-4 text-right font-medium",
                      snapshot.grossTradingRevenue >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(snapshot.grossTradingRevenue)}
                    </td>
                    <td className={cn(
                      "px-4 py-4 text-right",
                      snapshot.netRevenue >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(snapshot.netRevenue)}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-300">
                      {formatCurrency(snapshot.totalTradeVolume)}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-300">
                      {formatNumber(snapshot.totalTrades)}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-300">
                      {formatPercent(snapshot.brokerWinRate)}
                    </td>
                    <td className="px-4 py-4 text-right text-amber-400">
                      {formatCurrency(snapshot.operatingCosts)}
                    </td>
                    <td className={cn(
                      "px-4 py-4 text-right font-bold",
                      snapshot.netProfit >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(snapshot.netProfit)}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openCostsModal(snapshot);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded transition-colors"
                        title="Set Operating Costs"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Snapshot Detail Modal */}
      {selectedSnapshot && !showCostsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto m-4 border border-slate-700">
            <div className="sticky top-0 bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Snapshot: {format(new Date(selectedSnapshot.date), 'MMMM dd, yyyy')}
              </h2>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Gross Revenue</p>
                  <p className={cn(
                    "text-xl font-bold",
                    selectedSnapshot.grossTradingRevenue >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(selectedSnapshot.grossTradingRevenue)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Net Profit</p>
                  <p className={cn(
                    "text-xl font-bold",
                    selectedSnapshot.netProfit >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(selectedSnapshot.netProfit)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Total Volume</p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(selectedSnapshot.totalTradeVolume)}
                  </p>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-sm">Broker Win Rate</p>
                  <p className="text-xl font-bold text-white">
                    {formatPercent(selectedSnapshot.brokerWinRate)}
                  </p>
                </div>
              </div>

              {/* Trading Details */}
              <div>
                <h3 className="text-white font-medium mb-3">Trading Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Total Trades</span>
                    <span className="text-white">{formatNumber(selectedSnapshot.totalTrades)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Won Trades</span>
                    <span className="text-green-400">{formatNumber(selectedSnapshot.wonTrades)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Lost Trades</span>
                    <span className="text-red-400">{formatNumber(selectedSnapshot.lostTrades)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Avg Payout</span>
                    <span className="text-white">{formatPercent(selectedSnapshot.avgPayoutPercent)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Profit Factor</span>
                    <span className="text-white">{selectedSnapshot.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Revenue/Trade</span>
                    <span className="text-white">{formatCurrency(selectedSnapshot.revenuePerTrade)}</span>
                  </div>
                </div>
              </div>

              {/* User Segregation */}
              <div>
                <h3 className="text-white font-medium mb-3">User Segregation</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm font-medium">Real Users</p>
                    <p className="text-white">{formatNumber(selectedSnapshot.realUserTradeCount)} trades</p>
                    <p className="text-slate-400 text-sm">{formatCurrency(selectedSnapshot.realUserVolume)} volume</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-sm font-medium">Test Users</p>
                    <p className="text-white">{formatNumber(selectedSnapshot.testUserTradeCount)} trades</p>
                    <p className="text-slate-400 text-sm">{formatCurrency(selectedSnapshot.testUserVolume)} volume</p>
                  </div>
                </div>
              </div>

              {/* Deposits & Withdrawals */}
              <div>
                <h3 className="text-white font-medium mb-3">Cash Flow</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Deposits</span>
                    <span className="text-green-400">{formatCurrency(selectedSnapshot.totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Withdrawals</span>
                    <span className="text-red-400">{formatCurrency(selectedSnapshot.totalWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-700/30 rounded">
                    <span className="text-slate-400">Net Deposits</span>
                    <span className={cn(
                      selectedSnapshot.netDeposits >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {formatCurrency(selectedSnapshot.netDeposits)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => openCostsModal(selectedSnapshot)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Set Operating Costs
                </button>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Costs Modal */}
      {showCostsModal && selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-800 rounded-lg w-full max-w-md m-4 border border-slate-700">
            <div className="px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Set Operating Costs</h2>
              <p className="text-slate-400 text-sm">
                For {format(new Date(selectedSnapshot.date), 'MMMM dd, yyyy')}
              </p>
            </div>
            <form onSubmit={handleSetCosts} className="p-6 space-y-4">
              {/* Error Message */}
              {mutationError && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium text-sm">Error</p>
                    <p className="text-red-300 text-sm">{mutationError}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Operating Costs ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={operatingCosts}
                  onChange={(e) => setOperatingCosts(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Admin Password</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className={cn(
                    "w-full px-4 py-2 bg-slate-700 border rounded-lg text-white",
                    mutationError ? "border-red-500/50" : "border-slate-600"
                  )}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeCostsModal}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={setCostsMutation.isPending}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {setCostsMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
