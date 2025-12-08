'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Settings,
  UserMinus,
  Loader2,
  Zap,
  Hand,
  Pause,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CopyTradingFollower, CopyMode } from '@/types';

interface MyFollowingProps {
  onRefreshStats: () => void;
}

export function MyFollowing({ onRefreshStats }: MyFollowingProps) {
  const [following, setFollowing] = useState<CopyTradingFollower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyFollowing();
      setFollowing(data.following);
    } catch (error) {
      console.error('Failed to load following:', error);
      toast.error('Failed to load following');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleToggleActive = async (leaderId: string, isActive: boolean) => {
    try {
      await api.updateFollowSettings(leaderId, { isActive: !isActive });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (following.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
        <Users className="h-16 w-16 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4 text-lg">Not following anyone yet</p>
        <p className="text-slate-500 text-sm mt-1">
          Discover leaders and start copying their trades
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      'bg-slate-800 rounded-xl border transition-colors',
      follow.isActive ? 'border-slate-700' : 'border-yellow-600/30 bg-yellow-900/10'
    )}>
      {/* Main Content */}
      <div className="p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {follow.leader.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{follow.leader.displayName}</h3>
                {!follow.isActive && (
                  <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 text-xs rounded">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm">
                {follow.leader.user.name} | {follow.leader.winRate.toFixed(1)}% win rate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleActive}
              className={cn(
                'p-2 rounded-lg transition-colors',
                follow.isActive
                  ? 'hover:bg-yellow-600/20 text-yellow-400'
                  : 'hover:bg-emerald-600/20 text-emerald-400'
              )}
              title={follow.isActive ? 'Pause copying' : 'Resume copying'}
            >
              {follow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-xs">Mode</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {follow.copyMode === 'AUTOMATIC' ? (
                <Zap className="h-4 w-4 text-emerald-400" />
              ) : (
                <Hand className="h-4 w-4 text-blue-400" />
              )}
              <span className="text-white text-sm font-medium">
                {follow.copyMode === 'AUTOMATIC' ? 'Auto' : 'Manual'}
              </span>
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-xs">Amount</p>
            <p className="text-white font-medium mt-1">${follow.fixedAmount}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-xs">Copied</p>
            <p className="text-white font-medium mt-1">{follow.totalCopied}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center sm:col-span-1 col-span-2">
            <p className="text-slate-400 text-xs">Profit</p>
            <p className={cn(
              'font-medium mt-1',
              follow.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {follow.totalProfit >= 0 ? '+' : ''}${follow.totalProfit.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div className="p-4 border-t border-slate-700 space-y-4 bg-slate-900/40">
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

          <p className="text-slate-400 text-xs sm:text-sm">
            Auto mirrors trades instantly; Manual lets you confirm each trade. Limits apply per leader.
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
