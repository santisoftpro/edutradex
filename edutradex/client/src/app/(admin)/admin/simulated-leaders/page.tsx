'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Sparkles,
  TrendingUp,
  Trophy,
  RefreshCw,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import type { SimulatedLeader, SimulatedLeaderStats, CreateSimulatedLeaderInput } from '@/types';

export default function SimulatedLeadersPage() {
  const [leaders, setLeaders] = useState<SimulatedLeader[]>([]);
  const [stats, setStats] = useState<SimulatedLeaderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAutoGenerateModal, setShowAutoGenerateModal] = useState(false);
  const [editingLeader, setEditingLeader] = useState<SimulatedLeader | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [leadersData, statsData] = await Promise.all([
        api.getSimulatedLeaders(),
        api.getSimulatedLeaderStats(),
      ]);
      setLeaders(leadersData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load simulated leaders:', error);
      toast.error('Failed to load simulated leaders');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (id: string) => {
    setProcessingId(id);
    try {
      await api.toggleSimulatedLeader(id);
      await loadData();
      toast.success('Status updated');
    } catch (error) {
      toast.error('Failed to toggle status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this simulated leader?')) return;

    setProcessingId(id);
    try {
      await api.deleteSimulatedLeader(id);
      await loadData();
      toast.success('Simulated leader deleted');
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Simulated Leaders</h1>
          <p className="text-slate-400 mt-1">
            Create and manage fake traders for live activity simulation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutoGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Auto Generate
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total" value={stats.total} icon={Users} color="blue" />
          <StatCard label="Active" value={stats.active} icon={ToggleRight} color="emerald" />
          <StatCard label="Inactive" value={stats.inactive} icon={ToggleLeft} color="slate" />
        </div>
      )}

      {/* Leaders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
          <Users className="h-16 w-16 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-4 text-lg">No simulated leaders yet</p>
          <p className="text-slate-500 text-sm mt-1">
            Create or auto-generate simulated leaders to show fake activity
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setShowAutoGenerateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Auto Generate
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Leader</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Win Rate</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Profit</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Trades</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Followers</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {leaders.map((leader) => (
                  <tr key={leader.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                          {leader.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{leader.displayName}</p>
                          {leader.description && (
                            <p className="text-slate-500 text-xs truncate max-w-[200px]">
                              {leader.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-medium">{leader.winRate.toFixed(1)}%</span>
                      <span className="text-slate-500 text-xs ml-1">
                        ({leader.winRateMin}-{leader.winRateMax}%)
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('font-medium', leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(leader.totalProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white">{leader.totalTrades}</td>
                    <td className="px-4 py-3 text-white">{leader.followerCount}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                        leader.isActive
                          ? 'bg-emerald-600/20 text-emerald-400'
                          : 'bg-slate-600/20 text-slate-400'
                      )}>
                        {leader.isActive ? (
                          <>
                            <Check className="h-3 w-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggle(leader.id)}
                          disabled={processingId === leader.id}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            leader.isActive
                              ? 'text-emerald-400 hover:bg-emerald-900/30'
                              : 'text-slate-400 hover:bg-slate-700'
                          )}
                          title={leader.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {processingId === leader.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : leader.isActive ? (
                            <ToggleRight className="h-4 w-4" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setEditingLeader(leader)}
                          className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(leader.id)}
                          disabled={processingId === leader.id}
                          className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLeader) && (
        <LeaderFormModal
          leader={editingLeader}
          onClose={() => {
            setShowCreateModal(false);
            setEditingLeader(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingLeader(null);
            loadData();
          }}
        />
      )}

      {/* Auto Generate Modal */}
      {showAutoGenerateModal && (
        <AutoGenerateModal
          onClose={() => setShowAutoGenerateModal(false)}
          onSuccess={() => {
            setShowAutoGenerateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'slate';
}) {
  const colors = {
    emerald: 'bg-emerald-600/20 text-emerald-400',
    blue: 'bg-[#1079ff]/20 text-[#1079ff]',
    slate: 'bg-slate-600/20 text-slate-400',
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function LeaderFormModal({
  leader,
  onClose,
  onSuccess,
}: {
  leader: SimulatedLeader | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = !!leader;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateSimulatedLeaderInput>({
    displayName: leader?.displayName || '',
    description: leader?.description || '',
    winRate: leader?.winRate || 65,
    totalProfit: leader?.totalProfit || 1000,
    totalTrades: leader?.totalTrades || 100,
    followerCount: leader?.followerCount || 50,
    winRateMin: leader?.winRateMin || 60,
    winRateMax: leader?.winRateMax || 85,
    profitMin: leader?.profitMin || 500,
    profitMax: leader?.profitMax || 10000,
    followerMin: leader?.followerMin || 20,
    followerMax: leader?.followerMax || 500,
    tradesMin: leader?.tradesMin || 50,
    tradesMax: leader?.tradesMax || 1000,
    tradeFrequency: leader?.tradeFrequency || 5,
    isActive: leader?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && leader) {
        await api.updateSimulatedLeader(leader.id, formData);
        toast.success('Simulated leader updated');
      } else {
        await api.createSimulatedLeader(formData);
        toast.success('Simulated leader created');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {isEditing ? 'Edit Simulated Leader' : 'Create Simulated Leader'}
            </h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Display Name *</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                    placeholder="e.g., Alex_Trades"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Trade Frequency (per hour)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.tradeFrequency}
                    onChange={(e) => setFormData({ ...formData, tradeFrequency: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Brief trading strategy description..."
                />
              </div>
            </div>

            {/* Current Stats */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">Current Stats (Base Values)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Win Rate %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.winRate}
                    onChange={(e) => setFormData({ ...formData, winRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Total Profit $</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.totalProfit}
                    onChange={(e) => setFormData({ ...formData, totalProfit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Total Trades</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.totalTrades}
                    onChange={(e) => setFormData({ ...formData, totalTrades: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Followers</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.followerCount}
                    onChange={(e) => setFormData({ ...formData, followerCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>
            </div>

            {/* Variation Bounds */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-3">
                Animation Bounds
                <span className="text-slate-500 font-normal ml-2">(Stats will fluctuate within these ranges)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Win Rate Min %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.winRateMin}
                    onChange={(e) => setFormData({ ...formData, winRateMin: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Win Rate Max %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.winRateMax}
                    onChange={(e) => setFormData({ ...formData, winRateMax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Follower Min</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.followerMin}
                    onChange={(e) => setFormData({ ...formData, followerMin: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Follower Max</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.followerMax}
                    onChange={(e) => setFormData({ ...formData, followerMax: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
                  />
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Active Status</p>
                <p className="text-slate-500 text-sm">Show this leader in the discover list</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  formData.isActive ? 'bg-emerald-600' : 'bg-slate-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEditing ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AutoGenerateModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [count, setCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (count < 1 || count > 20) {
      toast.error('Count must be between 1 and 20');
      return;
    }

    setIsGenerating(true);
    try {
      const leaders = await api.autoGenerateSimulatedLeaders(count);
      toast.success(`Generated ${leaders.length} simulated leaders`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl max-w-md w-full mx-4 border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Auto Generate</h2>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <p className="text-slate-400 mb-4">
            Automatically generate simulated leaders with realistic trading stats and profiles.
          </p>

          <div>
            <label className="block text-sm text-slate-300 mb-2">Number of Leaders to Generate</label>
            <input
              type="number"
              min="1"
              max="20"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            />
            <p className="text-slate-500 text-sm mt-2">Maximum 20 at a time</p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate {count} Leaders
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
