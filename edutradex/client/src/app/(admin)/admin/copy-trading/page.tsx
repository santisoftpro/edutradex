'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Trophy,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Zap,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import type {
  CopyTradingPlatformStats,
  CopyTradingLeaderDetail,
  LeaderStatus,
} from '@/types';

type TabType = 'pending' | 'all' | 'activity';

export default function AdminCopyTradingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [stats, setStats] = useState<CopyTradingPlatformStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [fakeActivityEnabled, setFakeActivityEnabled] = useState(false);
  const [isTogglingFakeActivity, setIsTogglingFakeActivity] = useState(false);

  useEffect(() => {
    loadStats();
    loadFakeActivitySetting();
  }, []);

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const data = await api.getAdminCopyTradingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadFakeActivitySetting = async () => {
    try {
      const data = await api.getFakeActivitySetting();
      setFakeActivityEnabled(data.enabled);
    } catch (error) {
      console.error('Failed to load fake activity setting:', error);
    }
  };

  const toggleFakeActivity = async () => {
    setIsTogglingFakeActivity(true);
    try {
      const newValue = !fakeActivityEnabled;
      await api.setFakeActivitySetting(newValue);
      setFakeActivityEnabled(newValue);
      toast.success(`Live activity simulation ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle fake activity:', error);
      toast.error('Failed to toggle live activity simulation');
    } finally {
      setIsTogglingFakeActivity(false);
    }
  };

  const tabs = [
    { id: 'pending' as const, label: 'Pending Applications', icon: Clock, count: stats?.pendingLeaders },
    { id: 'all' as const, label: 'All Leaders', icon: Trophy },
    { id: 'activity' as const, label: 'Recent Activity', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Copy Trading Management</h1>
          <p className="text-slate-400 mt-1">Manage leaders, followers, and copy trading activity</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Activity Simulation Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg">
            <Zap className={cn('h-4 w-4', fakeActivityEnabled ? 'text-yellow-400' : 'text-slate-500')} />
            <span className="text-sm text-slate-300">Live Simulation</span>
            <button
              onClick={toggleFakeActivity}
              disabled={isTogglingFakeActivity}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:ring-offset-2 focus:ring-offset-slate-800',
                fakeActivityEnabled ? 'bg-emerald-600' : 'bg-slate-600',
                isTogglingFakeActivity && 'opacity-50 cursor-not-allowed'
              )}
              title={fakeActivityEnabled ? 'Disable live activity simulation' : 'Enable live activity simulation'}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  fakeActivityEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <button
            onClick={loadStats}
            disabled={isLoadingStats}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoadingStats && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Leaders"
            value={stats.totalLeaders}
            icon={Trophy}
            color="emerald"
          />
          <StatCard
            title="Approved Leaders"
            value={stats.approvedLeaders}
            icon={CheckCircle}
            color="blue"
          />
          <StatCard
            title="Pending Approvals"
            value={stats.pendingLeaders}
            icon={Clock}
            color="yellow"
          />
          <StatCard
            title="Total Followers"
            value={stats.totalFollowers}
            icon={Users}
            color="purple"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-[#1079ff] text-[#1079ff]'
                  : 'border-transparent text-slate-400 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-yellow-500 text-black">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && <PendingLeadersTab onRefresh={loadStats} />}
      {activeTab === 'all' && <AllLeadersTab />}
      {activeTab === 'activity' && <ActivityTab />}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'yellow' | 'purple';
}) {
  const colors = {
    emerald: 'bg-emerald-600/20 text-emerald-400',
    blue: 'bg-[#1079ff]/20 text-[#1079ff]',
    yellow: 'bg-yellow-600/20 text-yellow-400',
    purple: 'bg-purple-600/20 text-purple-400',
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-slate-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PendingLeadersTab({ onRefresh }: { onRefresh: () => void }) {
  const [leaders, setLeaders] = useState<CopyTradingLeaderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPendingLeaders();
  }, [page]);

  const loadPendingLeaders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAdminPendingLeaders({ page, limit: 10 });
      setLeaders(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load pending leaders:', error);
      toast.error('Failed to load pending leaders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (leaderId: string) => {
    setProcessingId(leaderId);
    try {
      await api.approveLeader(leaderId);
      toast.success('Leader approved successfully');
      loadPendingLeaders();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve leader');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (leaderId: string) => {
    setProcessingId(leaderId);
    try {
      await api.rejectLeader(leaderId);
      toast.success('Leader application rejected');
      loadPendingLeaders();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject leader');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (leaders.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
        <CheckCircle className="h-16 w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-lg">No pending applications</p>
        <p className="text-slate-500 text-sm mt-1">
          All leader applications have been reviewed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {leaders.map((leader) => (
        <div
          key={leader.id}
          className="bg-slate-800 border border-slate-700 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {leader.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{leader.displayName}</h3>
                <p className="text-slate-400 text-sm">
                  {leader.user?.name} ({leader.user?.email})
                </p>
                {leader.description && (
                  <p className="text-slate-500 text-sm mt-1 max-w-xl">
                    {leader.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleReject(leader.id)}
                disabled={processingId === leader.id}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-600/20 hover:text-red-400 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {processingId === leader.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Reject
                  </>
                )}
              </button>
              <button
                onClick={() => handleApprove(leader.id)}
                disabled={processingId === leader.id}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {processingId === leader.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-6 text-sm">
            <div>
              <span className="text-slate-400">Applied: </span>
              <span className="text-white">{formatDate(leader.createdAt)}</span>
            </div>
            <div>
              <span className="text-slate-400">User Trades: </span>
              <span className="text-white">{leader.totalTrades}</span>
            </div>
            <div>
              <span className="text-slate-400">Win Rate: </span>
              <span className="text-white">{leader.winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-white">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function AllLeadersTab() {
  const [leaders, setLeaders] = useState<CopyTradingLeaderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLeader, setSelectedLeader] = useState<CopyTradingLeaderDetail | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadLeaders();
  }, [page, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      loadLeaders();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchInput]);

  const loadLeaders = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAdminLeaders({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: searchInput || undefined,
      });
      setLeaders(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load leaders:', error);
      toast.error('Failed to load leaders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async (leaderId: string) => {
    setProcessingId(leaderId);
    try {
      await api.suspendLeader(leaderId, 'Suspended by admin');
      toast.success('Leader suspended');
      loadLeaders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to suspend leader');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReinstate = async (leaderId: string) => {
    setProcessingId(leaderId);
    try {
      await api.reinstateLeader(leaderId);
      toast.success('Leader reinstated');
      loadLeaders();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reinstate leader');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: LeaderStatus) => {
    const config = {
      PENDING: { color: 'bg-yellow-600/20 text-yellow-400', icon: Clock },
      APPROVED: { color: 'bg-emerald-600/20 text-emerald-400', icon: CheckCircle },
      REJECTED: { color: 'bg-red-600/20 text-red-400', icon: XCircle },
      SUSPENDED: { color: 'bg-orange-600/20 text-orange-400', icon: AlertTriangle },
    };
    const { color, icon: Icon } = config[status];
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium', color)}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LeaderStatus | '');
            setPage(1);
          }}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Leader</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Status</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Followers</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Win Rate</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Total Profit</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : leaders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No leaders found
                  </td>
                </tr>
              ) : (
                leaders.map((leader) => (
                  <tr key={leader.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {leader.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{leader.displayName}</p>
                          <p className="text-sm text-slate-400">{leader.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(leader.status as LeaderStatus)}
                    </td>
                    <td className="px-6 py-4 text-white">{leader.followerCount}</td>
                    <td className="px-6 py-4 text-white">{leader.winRate.toFixed(1)}%</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'font-medium',
                        leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedLeader(leader)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {leader.status === 'APPROVED' && (
                          <button
                            onClick={() => handleSuspend(leader.id)}
                            disabled={processingId === leader.id}
                            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-orange-900/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Suspend"
                          >
                            {processingId === leader.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        {leader.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReinstate(leader.id)}
                            disabled={processingId === leader.id}
                            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 rounded-lg transition-colors disabled:opacity-50"
                            title="Reinstate"
                          >
                            {processingId === leader.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-white">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {/* Leader Detail Modal */}
      {selectedLeader && (
        <LeaderDetailModal
          leader={selectedLeader}
          onClose={() => setSelectedLeader(null)}
          onUpdate={() => {
            loadLeaders();
            setSelectedLeader(null);
          }}
        />
      )}
    </div>
  );
}

function LeaderDetailModal({
  leader,
  onClose,
  onUpdate,
}: {
  leader: CopyTradingLeaderDetail;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [followers, setFollowers] = useState<any[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(true);
  const [showEditStats, setShowEditStats] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editStats, setEditStats] = useState({
    winRate: leader.winRate,
    totalTrades: leader.totalTrades,
    winningTrades: leader.winningTrades,
    totalProfit: leader.totalProfit,
  });

  useEffect(() => {
    loadFollowers();
  }, [leader.id]);

  const loadFollowers = async () => {
    setIsLoadingFollowers(true);
    try {
      const response = await api.getAdminLeaderFollowers(leader.id);
      setFollowers(response.data);
    } catch (error) {
      console.error('Failed to load followers:', error);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const handleUpdateStats = async () => {
    setIsUpdating(true);
    try {
      await api.updateLeaderStats(leader.id, editStats);
      toast.success('Leader stats updated successfully');
      setShowEditStats(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update stats');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {leader.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{leader.displayName}</h2>
                <p className="text-slate-400">{leader.user?.name} ({leader.user?.email})</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Stats Header with Edit Button */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">Statistics</h3>
            <button
              onClick={() => setShowEditStats(!showEditStats)}
              className={cn(
                'text-xs px-3 py-1 rounded-lg transition-colors',
                showEditStats
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              )}
            >
              {showEditStats ? 'Cancel Edit' : 'Edit Stats'}
            </button>
          </div>

          {/* Stats Display or Edit Form */}
          {showEditStats ? (
            <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Win Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editStats.winRate}
                    onChange={(e) => setEditStats({ ...editStats, winRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Trades</label>
                  <input
                    type="number"
                    min="0"
                    value={editStats.totalTrades}
                    onChange={(e) => setEditStats({ ...editStats, totalTrades: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Winning Trades</label>
                  <input
                    type="number"
                    min="0"
                    value={editStats.winningTrades}
                    onChange={(e) => setEditStats({ ...editStats, winningTrades: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Total Profit ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editStats.totalProfit}
                    onChange={(e) => setEditStats({ ...editStats, totalProfit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>
              <button
                onClick={handleUpdateStats}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Stats'
                )}
              </button>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Stats will be overwritten. Normal auto-updates will continue after trades.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">Win Rate</p>
                <p className="text-xl font-bold text-emerald-400">{leader.winRate.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">Total Trades</p>
                <p className="text-xl font-bold text-white">{leader.totalTrades}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">Total Profit</p>
                <p className={cn(
                  'text-xl font-bold',
                  leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toFixed(0)}
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs">Followers</p>
                <p className="text-xl font-bold text-white">{leader.followerCount}</p>
              </div>
            </div>
          )}

          {leader.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Description</h3>
              <p className="text-white">{leader.description}</p>
            </div>
          )}

          {/* Followers List */}
          <div>
            <h3 className="text-sm font-medium text-slate-400 mb-3">Followers ({followers.length})</h3>
            {isLoadingFollowers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-[#1079ff] animate-spin" />
              </div>
            ) : followers.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No followers yet</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {followers.map((follower) => (
                  <div
                    key={follower.id}
                    className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-sm">
                        {(follower.user?.name || follower.follower?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm">{follower.user?.name || follower.follower?.name}</p>
                        <p className="text-slate-400 text-xs">
                          {follower.copyMode === 'AUTOMATIC' ? 'Auto' : 'Manual'} | ${follower.fixedAmount}/trade
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white text-sm">{follower.totalCopied} trades</p>
                      <p className={cn(
                        'text-xs',
                        follower.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}>
                        {follower.totalProfit >= 0 ? '+' : ''}${follower.totalProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityTab() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminCopyTradingActivity(20);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
        <TrendingUp className="h-16 w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-lg">No recent activity</p>
        <p className="text-slate-500 text-sm mt-1">
          Copy trading activity will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl divide-y divide-slate-700">
      {activities.map((activity, index) => (
        <div key={index} className="p-4 flex items-center gap-4">
          <div className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center',
            activity.type === 'copy' ? 'bg-emerald-600/20' :
            activity.type === 'follow' ? 'bg-blue-600/20' :
            'bg-slate-700'
          )}>
            {activity.type === 'copy' ? (
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            ) : activity.type === 'follow' ? (
              <Users className="h-5 w-5 text-blue-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-white">{activity.description}</p>
            <p className="text-slate-400 text-sm">{formatDate(activity.createdAt)}</p>
          </div>
          {activity.amount && (
            <div className="text-right">
              <p className="text-white font-medium">${activity.amount.toFixed(2)}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
