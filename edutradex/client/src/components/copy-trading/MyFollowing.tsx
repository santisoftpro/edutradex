'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Settings,
  UserMinus,
  Loader2,
  Percent,
  DollarSign,
  Pause,
  Play,
  Infinity,
  ChevronDown,
  X,
  Search,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CopyTradingFollower, CopyMode, SimulatedLeaderFollowingInfo, UpdateFollowSettingsInput } from '@/types';

interface MyFollowingProps {
  onRefreshStats: () => void;
}

export function MyFollowing({ onRefreshStats }: MyFollowingProps) {
  const [following, setFollowing] = useState<CopyTradingFollower[]>([]);
  const [simulatedFollowing, setSimulatedFollowing] = useState<SimulatedLeaderFollowingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadFollowing = useCallback(async () => {
    setIsLoading(true);
    try {
      const [realData, simulatedData] = await Promise.all([
        api.getMyFollowing(),
        api.getMySimulatedLeaderFollowing(),
      ]);
      setFollowing(realData.following);
      setSimulatedFollowing(simulatedData);
    } catch {
      toast.error('Failed to load following');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const handleUnfollow = async (leaderId: string, leaderName: string) => {
    if (!confirm(`Unfollow ${leaderName}?`)) return;
    try {
      await api.unfollowLeader(leaderId);
      toast.success(`Unfollowed ${leaderName}`);
      loadFollowing();
      onRefreshStats();
    } catch {
      toast.error('Failed to unfollow');
    }
  };

  const handleUnfollowSimulated = async (leaderId: string, leaderName: string) => {
    if (!confirm(`Unfollow ${leaderName}?`)) return;
    try {
      await api.unfollowSimulatedLeader(leaderId);
      toast.success(`Unfollowed ${leaderName}`);
      loadFollowing();
      onRefreshStats();
    } catch {
      toast.error('Failed to unfollow');
    }
  };

  const handleToggleActive = async (leaderId: string, isActive: boolean) => {
    try {
      await api.updateFollowSettings(leaderId, { isActive: !isActive });
      toast.success(isActive ? 'Paused' : 'Resumed');
      loadFollowing();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleToggleSimulatedActive = async (leaderId: string, isActive: boolean) => {
    try {
      await api.updateSimulatedLeaderFollowSettings(leaderId, { isActive: !isActive });
      toast.success(isActive ? 'Paused' : 'Resumed');
      loadFollowing();
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleUpdateSettings = async (leaderId: string, settings: UpdateFollowSettingsInput) => {
    try {
      await api.updateFollowSettings(leaderId, settings);
      toast.success('Settings saved');
      setEditingId(null);
      loadFollowing();
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleUpdateSimulatedSettings = async (leaderId: string, settings: UpdateFollowSettingsInput) => {
    try {
      await api.updateSimulatedLeaderFollowSettings(leaderId, settings);
      toast.success('Settings saved');
      setEditingId(null);
      loadFollowing();
    } catch {
      toast.error('Failed to save');
    }
  };

  const totalFollowing = following.length + simulatedFollowing.length;

  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;
    const query = searchQuery.toLowerCase().trim();
    return following.filter((f) =>
      f.leader.displayName.toLowerCase().includes(query)
    );
  }, [following, searchQuery]);

  const filteredSimulatedFollowing = useMemo(() => {
    if (!searchQuery.trim()) return simulatedFollowing;
    const query = searchQuery.toLowerCase().trim();
    return simulatedFollowing.filter((f) =>
      f.simulatedLeader.displayName.toLowerCase().includes(query)
    );
  }, [simulatedFollowing, searchQuery]);

  const hasResults = filteredFollowing.length > 0 || filteredSimulatedFollowing.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (totalFollowing === 0) {
    return (
      <div className="text-center py-20">
        <Users className="h-12 w-12 text-slate-600 mx-auto" />
        <p className="text-slate-400 mt-4">Not following anyone</p>
        <p className="text-slate-500 text-sm mt-1">Discover leaders to start copying</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search followed leaders..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>

      {!hasResults ? (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-3 text-sm">No leaders match your search</p>
        </div>
      ) : (
        <>
          {filteredFollowing.map((follow) => (
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

          {filteredSimulatedFollowing.map((follow) => (
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
        </>
      )}
    </div>
  );
}

interface FollowingCardProps {
  follow: CopyTradingFollower;
  isEditing: boolean;
  onEdit: () => void;
  onUnfollow: () => void;
  onToggleActive: () => void;
  onUpdateSettings: (settings: UpdateFollowSettingsInput) => void;
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
  const [percentageAmount, setPercentageAmount] = useState(follow.percentageAmount || 100);
  const [fixedAmount, setFixedAmount] = useState(follow.fixedAmount || 10);
  const [dailyLossLimit, setDailyLossLimit] = useState<number | null>(follow.dailyLossLimit);
  const [dailyProfitLimit, setDailyProfitLimit] = useState<number | null>(follow.dailyProfitLimit);
  const [maxDailyTrades, setMaxDailyTrades] = useState(follow.maxDailyTrades || 50);
  const [unlimitedTrades, setUnlimitedTrades] = useState(follow.unlimitedTrades || false);

  const handleSave = () => {
    onUpdateSettings({
      copyMode,
      percentageAmount: copyMode === 'PERCENTAGE' ? percentageAmount : undefined,
      fixedAmount: copyMode === 'FIXED_AMOUNT' ? fixedAmount : undefined,
      dailyLossLimit: copyMode === 'FIXED_AMOUNT' ? dailyLossLimit : null,
      dailyProfitLimit: copyMode === 'FIXED_AMOUNT' ? dailyProfitLimit : null,
      maxDailyTrades: unlimitedTrades ? null : maxDailyTrades,
      unlimitedTrades,
    });
  };

  const isPercentageMode = follow.copyMode === 'PERCENTAGE';

  return (
    <div className={cn(
      'bg-slate-800/30 rounded-xl overflow-hidden transition-all',
      !follow.isActive && 'opacity-60'
    )}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-emerald-500 to-blue-500">
            {follow.leader.displayName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium text-sm truncate">{follow.leader.displayName}</h3>
            {!follow.isActive && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded font-medium">
                PAUSED
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs">
            {isPercentageMode ? `${follow.percentageAmount}%` : formatCurrency(follow.fixedAmount || 10)} per trade
          </p>
        </div>

        {/* Stats */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className={cn(
            'font-semibold text-sm',
            follow.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
          )}>
            {follow.totalProfit >= 0 ? '+' : ''}{formatCurrency(follow.totalProfit)}
          </p>
          <p className="text-slate-500 text-xs">{follow.totalCopied} copied</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleActive}
            className={cn(
              'p-2 rounded-lg transition-colors',
              follow.isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
            )}
          >
            {follow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isEditing ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'
            )}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </button>
          <button
            onClick={onUnfollow}
            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <EditPanel
          copyMode={copyMode}
          setCopyMode={setCopyMode}
          percentageAmount={percentageAmount}
          setPercentageAmount={setPercentageAmount}
          fixedAmount={fixedAmount}
          setFixedAmount={setFixedAmount}
          dailyLossLimit={dailyLossLimit}
          setDailyLossLimit={setDailyLossLimit}
          dailyProfitLimit={dailyProfitLimit}
          setDailyProfitLimit={setDailyProfitLimit}
          maxDailyTrades={maxDailyTrades}
          setMaxDailyTrades={setMaxDailyTrades}
          unlimitedTrades={unlimitedTrades}
          setUnlimitedTrades={setUnlimitedTrades}
          onSave={handleSave}
          onCancel={onEdit}
        />
      )}
    </div>
  );
}

interface SimulatedFollowingCardProps {
  follow: SimulatedLeaderFollowingInfo;
  isEditing: boolean;
  onEdit: () => void;
  onUnfollow: () => void;
  onToggleActive: () => void;
  onUpdateSettings: (settings: UpdateFollowSettingsInput) => void;
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
  const [percentageAmount, setPercentageAmount] = useState(follow.percentageAmount || 100);
  const [fixedAmount, setFixedAmount] = useState(follow.fixedAmount || 10);
  const [dailyLossLimit, setDailyLossLimit] = useState<number | null>(follow.dailyLossLimit);
  const [dailyProfitLimit, setDailyProfitLimit] = useState<number | null>(follow.dailyProfitLimit);
  const [maxDailyTrades, setMaxDailyTrades] = useState(follow.maxDailyTrades || 50);
  const [unlimitedTrades, setUnlimitedTrades] = useState(follow.unlimitedTrades || false);

  const handleSave = () => {
    onUpdateSettings({
      copyMode,
      percentageAmount: copyMode === 'PERCENTAGE' ? percentageAmount : undefined,
      fixedAmount: copyMode === 'FIXED_AMOUNT' ? fixedAmount : undefined,
      dailyLossLimit: copyMode === 'FIXED_AMOUNT' ? dailyLossLimit : null,
      dailyProfitLimit: copyMode === 'FIXED_AMOUNT' ? dailyProfitLimit : null,
      maxDailyTrades: unlimitedTrades ? null : maxDailyTrades,
      unlimitedTrades,
    });
  };

  const leader = follow.simulatedLeader;
  const isPercentageMode = follow.copyMode === 'PERCENTAGE';

  return (
    <div className={cn(
      'bg-slate-800/30 rounded-xl overflow-hidden transition-all',
      !follow.isActive && 'opacity-60'
    )}>
      {/* Main Row */}
      <div className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-emerald-500 to-blue-500">
            {leader.displayName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium text-sm truncate">{leader.displayName}</h3>
            {!follow.isActive && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded font-medium">
                PAUSED
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs">
            {isPercentageMode ? `${follow.percentageAmount}%` : formatCurrency(follow.fixedAmount || 10)} per trade
          </p>
        </div>

        {/* Stats */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="font-semibold text-sm text-emerald-400">
            {formatCurrency(leader.totalProfit)}
          </p>
          <p className="text-slate-500 text-xs">{leader.totalTrades} trades</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleActive}
            className={cn(
              'p-2 rounded-lg transition-colors',
              follow.isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
            )}
          >
            {follow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isEditing ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'
            )}
          >
            {isEditing ? <X className="h-4 w-4" /> : <Settings className="h-4 w-4" />}
          </button>
          <button
            onClick={onUnfollow}
            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <UserMinus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <EditPanel
          copyMode={copyMode}
          setCopyMode={setCopyMode}
          percentageAmount={percentageAmount}
          setPercentageAmount={setPercentageAmount}
          fixedAmount={fixedAmount}
          setFixedAmount={setFixedAmount}
          dailyLossLimit={dailyLossLimit}
          setDailyLossLimit={setDailyLossLimit}
          dailyProfitLimit={dailyProfitLimit}
          setDailyProfitLimit={setDailyProfitLimit}
          maxDailyTrades={maxDailyTrades}
          setMaxDailyTrades={setMaxDailyTrades}
          unlimitedTrades={unlimitedTrades}
          setUnlimitedTrades={setUnlimitedTrades}
          onSave={handleSave}
          onCancel={onEdit}
        />
      )}
    </div>
  );
}

interface EditPanelProps {
  copyMode: CopyMode;
  setCopyMode: (mode: CopyMode) => void;
  percentageAmount: number;
  setPercentageAmount: (val: number) => void;
  fixedAmount: number;
  setFixedAmount: (val: number) => void;
  dailyLossLimit: number | null;
  setDailyLossLimit: (val: number | null) => void;
  dailyProfitLimit: number | null;
  setDailyProfitLimit: (val: number | null) => void;
  maxDailyTrades: number;
  setMaxDailyTrades: (val: number) => void;
  unlimitedTrades: boolean;
  setUnlimitedTrades: (val: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

function EditPanel({
  copyMode,
  setCopyMode,
  percentageAmount,
  setPercentageAmount,
  fixedAmount,
  setFixedAmount,
  dailyLossLimit,
  setDailyLossLimit,
  dailyProfitLimit,
  setDailyProfitLimit,
  maxDailyTrades,
  setMaxDailyTrades,
  unlimitedTrades,
  setUnlimitedTrades,
  onSave,
  onCancel,
}: EditPanelProps) {
  return (
    <div className="p-4 border-t border-slate-700/50 space-y-4 bg-slate-900/30">
      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setCopyMode('PERCENTAGE')}
          className={cn(
            'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
            copyMode === 'PERCENTAGE'
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-600'
          )}
        >
          <Percent className="h-4 w-4" />
          <span className="text-sm font-medium">Percentage</span>
        </button>
        <button
          onClick={() => setCopyMode('FIXED_AMOUNT')}
          className={cn(
            'flex items-center justify-center gap-2 p-3 rounded-lg border transition-all',
            copyMode === 'FIXED_AMOUNT'
              ? 'border-blue-500 bg-blue-500/10 text-blue-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-600'
          )}
        >
          <DollarSign className="h-4 w-4" />
          <span className="text-sm font-medium">Fixed</span>
        </button>
      </div>

      {/* Amount Input */}
      {copyMode === 'PERCENTAGE' ? (
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Copy percentage</label>
          <div className="relative">
            <input
              type="number"
              value={percentageAmount}
              onChange={(e) => setPercentageAmount(Number(e.target.value))}
              min={1}
              max={1000}
              className="w-full px-4 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">%</span>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Fixed amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(Number(e.target.value))}
                min={1}
                max={10000}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Daily loss limit</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={dailyLossLimit ?? ''}
                  onChange={(e) => setDailyLossLimit(e.target.value ? Number(e.target.value) : null)}
                  min={1}
                  placeholder="No limit"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Daily profit limit</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  type="number"
                  value={dailyProfitLimit ?? ''}
                  onChange={(e) => setDailyProfitLimit(e.target.value ? Number(e.target.value) : null)}
                  min={1}
                  placeholder="No limit"
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Max Daily Trades */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-500">Max daily trades</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unlimitedTrades}
              onChange={(e) => setUnlimitedTrades(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Infinity className="h-3 w-3" /> Unlimited
            </span>
          </label>
        </div>
        {!unlimitedTrades && (
          <input
            type="number"
            value={maxDailyTrades}
            onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
            min={1}
            max={500}
            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
