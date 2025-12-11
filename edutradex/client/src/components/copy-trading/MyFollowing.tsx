'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Settings,
  UserMinus,
  Loader2,
  Zap,
  Hand,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CopyTradingFollower, CopyMode, SimulatedLeaderFollowingInfo } from '@/types';

interface MyFollowingProps {
  onRefreshStats: () => void;
}

export function MyFollowing({ onRefreshStats }: MyFollowingProps) {
  const [following, setFollowing] = useState<CopyTradingFollower[]>([]);
  const [simulatedFollowing, setSimulatedFollowing] = useState<SimulatedLeaderFollowingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadFollowing = useCallback(async () => {
    setIsLoading(true);
    try {
      const [realData, simulatedData] = await Promise.all([
        api.getMyFollowing(),
        api.getMySimulatedLeaderFollowing(),
      ]);
      setFollowing(realData.following);
      setSimulatedFollowing(simulatedData);
    } catch (error) {
      console.error('Failed to load following:', error);
      toast.error('Failed to load following');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const handleUnfollow = async (leaderId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to unfollow ${displayName}?`)) return;

    try {
      await api.unfollowLeader(leaderId);
      toast.success(`Unfollowed ${displayName}`);
      loadFollowing();
      onRefreshStats();
    } catch (error) {
      toast.error('Failed to unfollow');
    }
  };

  const handleUnfollowSimulated = async (leaderId: string, displayName: string) => {
    if (!confirm(`Are you sure you want to unfollow ${displayName}?`)) return;

    try {
      await api.unfollowSimulatedLeader(leaderId);
      toast.success(`Unfollowed ${displayName}`);
      loadFollowing();
      onRefreshStats();
    } catch (error) {
      toast.error('Failed to unfollow');
    }
  };

  const handleToggleActive = async (leaderId: string, isActive: boolean) => {
    try {
      await api.updateFollowSettings(leaderId, { isActive: !isActive });
      toast.success(isActive ? 'Copying paused' : 'Copying resumed');
      loadFollowing();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleToggleSimulatedActive = async (leaderId: string, isActive: boolean) => {
    try {
      await api.updateSimulatedLeaderFollowSettings(leaderId, { isActive: !isActive });
      toast.success(isActive ? 'Copying paused' : 'Copying resumed');
      loadFollowing();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleUpdateSettings = async (
    leaderId: string,
    settings: { copyMode?: CopyMode; fixedAmount?: number; maxDailyTrades?: number }
  ) => {
    try {
      await api.updateFollowSettings(leaderId, settings);
      toast.success('Settings updated');
      setEditingId(null);
      loadFollowing();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const handleUpdateSimulatedSettings = async (
    leaderId: string,
    settings: { copyMode?: CopyMode; fixedAmount?: number; maxDailyTrades?: number }
  ) => {
    try {
      await api.updateSimulatedLeaderFollowSettings(leaderId, settings);
      toast.success('Settings updated');
      setEditingId(null);
      loadFollowing();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const totalFollowing = following.length + simulatedFollowing.length;

  if (totalFollowing === 0) {
    return (
      <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <Users className="h-12 w-12 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4">Not following anyone yet</p>
        <p className="text-slate-500 text-sm mt-1">
          Discover leaders and start copying their trades
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Real Leaders */}
      {following.map((follow) => (
        <FollowingCard
          key={follow.id}
          follow={follow}
          isEditing={editingId === follow.id}
          onEdit={() => setEditingId(editingId === follow.id ? null : follow.id)}
          onUnfollow={() => handleUnfollow(follow.leaderId, follow.leader.displayName)}
          onToggleActive={() => handleToggleActive(follow.leaderId, follow.isActive)}
          onUpdateSettings={(settings) => handleUpdateSettings(follow.leaderId, settings)}
        />
      ))}

      {/* Simulated Leaders */}
      {simulatedFollowing.map((follow) => (
        <SimulatedFollowingCard
          key={follow.id}
          follow={follow}
          isEditing={editingId === `sim-${follow.id}`}
          onEdit={() => setEditingId(editingId === `sim-${follow.id}` ? null : `sim-${follow.id}`)}
          onUnfollow={() => handleUnfollowSimulated(follow.simulatedLeaderId, follow.simulatedLeader.displayName)}
          onToggleActive={() => handleToggleSimulatedActive(follow.simulatedLeaderId, follow.isActive)}
          onUpdateSettings={(settings) => handleUpdateSimulatedSettings(follow.simulatedLeaderId, settings)}
        />
      ))}
    </div>
  );
}

interface FollowingCardProps {
  follow: CopyTradingFollower;
  isEditing: boolean;
  onEdit: () => void;
  onUnfollow: () => void;
  onToggleActive: () => void;
  onUpdateSettings: (settings: { copyMode?: CopyMode; fixedAmount?: number; maxDailyTrades?: number }) => void;
}

function FollowingCard({
  follow,
  isEditing,
  onEdit,
  onUnfollow,
  onToggleActive,
  onUpdateSettings,
}: FollowingCardProps) {
  const [copyMode, setCopyMode] = useState<CopyMode>(follow.copyMode as CopyMode);
  const [fixedAmount, setFixedAmount] = useState(follow.fixedAmount);
  const [maxDailyTrades, setMaxDailyTrades] = useState(follow.maxDailyTrades);

  const handleSave = () => {
    onUpdateSettings({ copyMode, fixedAmount, maxDailyTrades });
  };

  return (
    <div className={cn(
      'bg-slate-800/50 rounded-xl border transition-colors overflow-hidden',
      follow.isActive ? 'border-slate-700/50' : 'border-amber-600/30'
    )}>
      {/* Main Content */}
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {follow.leader.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{follow.leader.displayName}</h3>
                {!follow.isActive && (
                  <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs rounded font-medium">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {follow.leader.winRate.toFixed(1)}% win rate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleActive}
              className={cn(
                'p-2 rounded-lg transition-colors',
                follow.isActive
                  ? 'hover:bg-amber-600/20 text-amber-400'
                  : 'hover:bg-emerald-600/20 text-emerald-400'
              )}
              title={follow.isActive ? 'Pause copying' : 'Resume copying'}
            >
              {follow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isEditing ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-400'
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onUnfollow}
              className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
              title="Unfollow"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              {follow.copyMode === 'AUTOMATIC' ? (
                <Zap className="h-4 w-4 text-emerald-400" />
              ) : (
                <Hand className="h-4 w-4 text-blue-400" />
              )}
              <span className="text-white text-sm font-medium">
                {follow.copyMode === 'AUTOMATIC' ? 'Auto' : 'Manual'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1">Mode</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-white font-medium">{formatCurrency(follow.fixedAmount)}</p>
            <p className="text-slate-500 text-xs mt-1">Per Trade</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-white font-medium">{follow.totalCopied}</p>
            <p className="text-slate-500 text-xs mt-1">Copied</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className={cn(
              'font-medium',
              follow.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {follow.totalProfit >= 0 ? '+' : ''}{formatCurrency(follow.totalProfit)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Profit</p>
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div className="p-4 border-t border-slate-700/50 space-y-4 bg-slate-900/40">
          <h4 className="text-sm font-medium text-slate-300">Edit Settings</h4>

          {/* Copy Mode */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCopyMode('AUTOMATIC')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
                copyMode === 'AUTOMATIC'
                  ? 'border-emerald-500 bg-emerald-600/10'
                  : 'border-slate-600 hover:border-slate-500'
              )}
            >
              <Zap className={cn(
                'h-4 w-4',
                copyMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-slate-400'
              )} />
              <span className={cn(
                'font-medium text-sm',
                copyMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-slate-300'
              )}>
                Automatic
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCopyMode('MANUAL')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
                copyMode === 'MANUAL'
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-slate-600 hover:border-slate-500'
              )}
            >
              <Hand className={cn(
                'h-4 w-4',
                copyMode === 'MANUAL' ? 'text-blue-400' : 'text-slate-400'
              )} />
              <span className={cn(
                'font-medium text-sm',
                copyMode === 'MANUAL' ? 'text-blue-400' : 'text-slate-300'
              )}>
                Manual
              </span>
            </button>
          </div>

          {/* Amount & Max Trades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount per trade</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(Number(e.target.value))}
                  min={1}
                  max={10000}
                  className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max daily trades</label>
              <input
                type="number"
                value={maxDailyTrades}
                onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
                min={1}
                max={500}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <p className="text-slate-500 text-xs">
            Auto mirrors trades instantly; Manual lets you confirm each trade.
          </p>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onEdit}
              className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Card for simulated leader subscriptions (visual only)
interface SimulatedFollowingCardProps {
  follow: SimulatedLeaderFollowingInfo;
  isEditing: boolean;
  onEdit: () => void;
  onUnfollow: () => void;
  onToggleActive: () => void;
  onUpdateSettings: (settings: { copyMode?: CopyMode; fixedAmount?: number; maxDailyTrades?: number }) => void;
}

function SimulatedFollowingCard({
  follow,
  isEditing,
  onEdit,
  onUnfollow,
  onToggleActive,
  onUpdateSettings,
}: SimulatedFollowingCardProps) {
  const [copyMode, setCopyMode] = useState<CopyMode>(follow.copyMode as CopyMode);
  const [fixedAmount, setFixedAmount] = useState(follow.fixedAmount);
  const [maxDailyTrades, setMaxDailyTrades] = useState(follow.maxDailyTrades);

  const handleSave = () => {
    onUpdateSettings({ copyMode, fixedAmount, maxDailyTrades });
  };

  const leader = follow.simulatedLeader;

  return (
    <div className={cn(
      'bg-slate-800/50 rounded-xl border transition-colors overflow-hidden',
      follow.isActive ? 'border-purple-700/30' : 'border-amber-600/30'
    )}>
      {/* Main Content */}
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {leader.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{leader.displayName}</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  <Sparkles className="h-3 w-3" />
                  Featured
                </span>
                {!follow.isActive && (
                  <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 text-xs rounded font-medium">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {leader.winRate.toFixed(1)}% win rate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleActive}
              className={cn(
                'p-2 rounded-lg transition-colors',
                follow.isActive
                  ? 'hover:bg-amber-600/20 text-amber-400'
                  : 'hover:bg-emerald-600/20 text-emerald-400'
              )}
              title={follow.isActive ? 'Pause copying' : 'Resume copying'}
            >
              {follow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isEditing ? 'bg-slate-700 text-white' : 'hover:bg-slate-700 text-slate-400'
              )}
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={onUnfollow}
              className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400"
              title="Unfollow"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1.5">
              {follow.copyMode === 'AUTOMATIC' ? (
                <Zap className="h-4 w-4 text-emerald-400" />
              ) : (
                <Hand className="h-4 w-4 text-blue-400" />
              )}
              <span className="text-white text-sm font-medium">
                {follow.copyMode === 'AUTOMATIC' ? 'Auto' : 'Manual'}
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1">Mode</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-white font-medium">{formatCurrency(follow.fixedAmount)}</p>
            <p className="text-slate-500 text-xs mt-1">Per Trade</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-purple-400 font-medium">{leader.totalTrades}</p>
            <p className="text-slate-500 text-xs mt-1">Leader Trades</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-emerald-400 font-medium">
              {formatCurrency(leader.totalProfit)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Leader Profit</p>
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div className="p-4 border-t border-slate-700/50 space-y-4 bg-slate-900/40">
          <h4 className="text-sm font-medium text-slate-300">Edit Settings</h4>

          {/* Copy Mode */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCopyMode('AUTOMATIC')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
                copyMode === 'AUTOMATIC'
                  ? 'border-emerald-500 bg-emerald-600/10'
                  : 'border-slate-600 hover:border-slate-500'
              )}
            >
              <Zap className={cn(
                'h-4 w-4',
                copyMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-slate-400'
              )} />
              <span className={cn(
                'font-medium text-sm',
                copyMode === 'AUTOMATIC' ? 'text-emerald-400' : 'text-slate-300'
              )}>
                Automatic
              </span>
            </button>
            <button
              type="button"
              onClick={() => setCopyMode('MANUAL')}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors',
                copyMode === 'MANUAL'
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-slate-600 hover:border-slate-500'
              )}
            >
              <Hand className={cn(
                'h-4 w-4',
                copyMode === 'MANUAL' ? 'text-blue-400' : 'text-slate-400'
              )} />
              <span className={cn(
                'font-medium text-sm',
                copyMode === 'MANUAL' ? 'text-blue-400' : 'text-slate-300'
              )}>
                Manual
              </span>
            </button>
          </div>

          {/* Amount & Max Trades */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount per trade</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(Number(e.target.value))}
                  min={1}
                  max={10000}
                  className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max daily trades</label>
              <input
                type="number"
                value={maxDailyTrades}
                onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
                min={1}
                max={500}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <button
              onClick={onEdit}
              className="w-full sm:w-auto px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
