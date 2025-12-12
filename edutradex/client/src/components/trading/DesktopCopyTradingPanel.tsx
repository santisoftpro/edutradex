'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Users,
  Star,
  Loader2,
  Check,
  ChevronRight,
  Settings,
  Pause,
  Play,
  UserMinus,
  Percent,
  DollarSign,
  Infinity,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FollowLeaderModal } from '@/components/copy-trading/FollowLeaderModal';
import { FollowSimulatedLeaderModal } from '@/components/copy-trading/FollowSimulatedLeaderModal';
import { useFakeActivity } from '@/hooks/useFakeActivity';
import type { CopyTradingLeader, SimulatedLeaderForDisplay, CopyMode, UpdateFollowSettingsInput } from '@/types';

const getOnlineStatus = (id: string): boolean => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 3 !== 0;
};

interface DesktopCopyTradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'discover' | 'following';
type SortOption = 'totalProfit' | 'winRate' | 'totalTrades' | 'followers';

interface DisplayLeader {
  id: string;
  displayName: string;
  winRate: number;
  totalProfit: number;
  totalTrades: number;
  followerCount: number;
  isSimulated: boolean;
  isFollowing?: boolean;
  isOnline: boolean;
}

export function DesktopCopyTradingPanel({ isOpen, onClose }: DesktopCopyTradingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [realLeaders, setRealLeaders] = useState<CopyTradingLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('totalProfit');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedLeader, setSelectedLeader] = useState<CopyTradingLeader | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedSimulatedLeader, setSelectedSimulatedLeader] = useState<SimulatedLeaderForDisplay | null>(null);
  const [showSimulatedFollowModal, setShowSimulatedFollowModal] = useState(false);
  const [followingSimulatedIds, setFollowingSimulatedIds] = useState<Set<string>>(new Set());

  const [realFollowingCount, setRealFollowingCount] = useState(0);
  const [simulatedFollowingCount, setSimulatedFollowingCount] = useState(0);

  const {
    isEnabled: fakeActivityEnabled,
    simulatedLeaders,
    animatedStats,
    isLoading: isLoadingSimulated,
  } = useFakeActivity();

  const loadLeaders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.discoverLeaders({ sortBy, sortOrder: 'desc' });
      setRealLeaders(data.leaders || []);
    } catch {
      setRealLeaders([]);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy]);

  const loadSimulatedFollowingIds = useCallback(async () => {
    try {
      const ids = await api.getMySimulatedLeaderFollowingIds();
      setFollowingSimulatedIds(new Set(ids));
      setSimulatedFollowingCount(ids.length);
    } catch {
      setFollowingSimulatedIds(new Set());
      setSimulatedFollowingCount(0);
    }
  }, []);

  const loadFollowingCounts = useCallback(async () => {
    try {
      const [realData, simulatedData] = await Promise.all([
        api.getMyFollowing(),
        api.getMySimulatedLeaderFollowing(),
      ]);
      setRealFollowingCount(realData.following?.length || 0);
      setSimulatedFollowingCount(simulatedData?.length || 0);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadLeaders();
      loadSimulatedFollowingIds();
      loadFollowingCounts();
    }
  }, [isOpen, loadLeaders, loadSimulatedFollowingIds, loadFollowingCounts]);

  const allLeaders = useMemo((): DisplayLeader[] => {
    const realDisplay: DisplayLeader[] = realLeaders.map((leader) => ({
      id: leader.id,
      displayName: leader.displayName,
      winRate: leader.winRate,
      totalProfit: leader.totalProfit,
      totalTrades: leader.totalTrades,
      followerCount: leader.followerCount,
      isSimulated: false,
      isFollowing: leader.isFollowing,
      isOnline: getOnlineStatus(leader.id),
    }));

    const simulatedDisplay: DisplayLeader[] = fakeActivityEnabled
      ? simulatedLeaders.map((leader) => {
          const stats = animatedStats.get(leader.id);
          return {
            id: leader.id,
            displayName: leader.displayName,
            winRate: stats?.winRate ?? leader.winRate,
            totalProfit: stats?.totalProfit ?? leader.totalProfit,
            totalTrades: stats?.totalTrades ?? leader.totalTrades,
            followerCount: stats?.followerCount ?? leader.followerCount,
            isSimulated: true,
            isFollowing: followingSimulatedIds.has(leader.id),
            isOnline: getOnlineStatus(leader.id),
          };
        })
      : [];

    const combined = [...realDisplay, ...simulatedDisplay];

    combined.sort((a, b) => {
      switch (sortBy) {
        case 'winRate': return b.winRate - a.winRate;
        case 'totalProfit': return b.totalProfit - a.totalProfit;
        case 'totalTrades': return b.totalTrades - a.totalTrades;
        case 'followers': return b.followerCount - a.followerCount;
        default: return 0;
      }
    });

    return combined;
  }, [realLeaders, simulatedLeaders, animatedStats, fakeActivityEnabled, sortBy, followingSimulatedIds]);

  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return allLeaders;
    const query = searchQuery.toLowerCase().trim();
    return allLeaders.filter((leader) =>
      leader.displayName.toLowerCase().includes(query)
    );
  }, [allLeaders, searchQuery]);

  const handleFollowClick = (leader: DisplayLeader) => {
    if (leader.isSimulated) {
      const simLeader = simulatedLeaders.find((l) => l.id === leader.id);
      if (simLeader) {
        setSelectedSimulatedLeader(simLeader);
        setShowSimulatedFollowModal(true);
      }
      return;
    }
    const realLeader = realLeaders.find((l) => l.id === leader.id);
    if (realLeader) {
      setSelectedLeader(realLeader);
      setShowFollowModal(true);
    }
  };

  const handleFollowSuccess = () => {
    setShowFollowModal(false);
    setSelectedLeader(null);
    loadLeaders();
    loadFollowingCounts();
    toast.success('Following!');
  };

  const handleSimulatedFollowSuccess = () => {
    setShowSimulatedFollowModal(false);
    setSelectedSimulatedLeader(null);
    loadSimulatedFollowingIds();
    loadFollowingCounts();
    toast.success('Following!');
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'totalProfit', label: 'Profit' },
    { value: 'winRate', label: 'Win Rate' },
    { value: 'totalTrades', label: 'Active' },
    { value: 'followers', label: 'Popular' },
  ];

  if (!isOpen) return null;

  const isPageLoading = isLoading || isLoadingSimulated;
  const totalFollowing = realFollowingCount + simulatedFollowingCount;

  return (
    <>
      <div className="hidden lg:block fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      <div className="hidden lg:flex fixed right-[68px] top-16 bottom-0 z-50 w-80 bg-slate-900 border-l border-slate-800 flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-white font-semibold text-sm">Copy Trading</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('discover')}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium transition-all',
              activeTab === 'discover'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={cn(
              'flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
              activeTab === 'following'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            )}
          >
            Following
            {totalFollowing > 0 && (
              <span className={cn(
                'min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold rounded-full px-1',
                activeTab === 'following' ? 'bg-white/20' : 'bg-slate-700'
              )}>
                {totalFollowing}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'discover' && (
            <div className="p-3 space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leaders..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
                />
              </div>

              {/* Sort Pills */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                      sortBy === option.value
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Leaders List */}
              {isPageLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                </div>
              ) : filteredLeaders.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 text-slate-700 mx-auto" />
                  <p className="text-slate-500 text-sm mt-2">{searchQuery ? 'No matches found' : 'No leaders found'}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredLeaders.slice(0, 15).map((leader, index) => (
                    <LeaderRow
                      key={leader.id}
                      leader={leader}
                      rank={index + 1}
                      onClick={() => handleFollowClick(leader)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <FollowingTab onRefresh={loadFollowingCounts} />
          )}
        </div>
      </div>

      {showFollowModal && selectedLeader && (
        <FollowLeaderModal
          leader={selectedLeader}
          onClose={() => { setShowFollowModal(false); setSelectedLeader(null); }}
          onSuccess={handleFollowSuccess}
        />
      )}

      {showSimulatedFollowModal && selectedSimulatedLeader && (
        <FollowSimulatedLeaderModal
          leader={selectedSimulatedLeader}
          onClose={() => { setShowSimulatedFollowModal(false); setSelectedSimulatedLeader(null); }}
          onSuccess={handleSimulatedFollowSuccess}
        />
      )}
    </>
  );
}

function LeaderRow({ leader, rank, onClick }: { leader: DisplayLeader; rank: number; onClick: () => void }) {
  const prevProfitRef = useRef(leader.totalProfit);
  const [animateProfit, setAnimateProfit] = useState(false);

  useEffect(() => {
    if (Math.abs(leader.totalProfit - prevProfitRef.current) > 0.01) {
      setAnimateProfit(true);
      const timeout = setTimeout(() => setAnimateProfit(false), 800);
      prevProfitRef.current = leader.totalProfit;
      return () => clearTimeout(timeout);
    }
  }, [leader.totalProfit]);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800/60 transition-colors text-left group"
    >
      <span className={cn(
        'w-5 text-center text-xs font-bold flex-shrink-0',
        rank <= 3 ? 'text-amber-400' : 'text-slate-600'
      )}>
        {rank}
      </span>

      <div className="relative flex-shrink-0">
        <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br from-emerald-500 to-blue-500">
          {leader.displayName.charAt(0).toUpperCase()}
        </div>
        {leader.isOnline && (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-slate-900 rounded-full" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-white font-medium text-xs truncate">{leader.displayName}</h3>
          {leader.isFollowing && <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />}
        </div>
        <p className="text-slate-600 text-[10px]">
          {leader.totalTrades} trades · {leader.winRate.toFixed(0)}%
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={cn(
          'font-semibold text-xs transition-transform',
          leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
          animateProfit && 'scale-110'
        )}>
          {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </p>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-500 transition-colors flex-shrink-0" />
    </button>
  );
}

function FollowingTab({ onRefresh }: { onRefresh: () => void }) {
  const [following, setFollowing] = useState<any[]>([]);
  const [simulatedFollowing, setSimulatedFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFollowing();
  }, []);

  const loadFollowing = async () => {
    setIsLoading(true);
    try {
      const [realData, simulatedData] = await Promise.all([
        api.getMyFollowing(),
        api.getMySimulatedLeaderFollowing(),
      ]);
      setFollowing(realData.following || []);
      setSimulatedFollowing(simulatedData || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;
    const query = searchQuery.toLowerCase().trim();
    return following.filter((f: any) =>
      f.leader.displayName.toLowerCase().includes(query)
    );
  }, [following, searchQuery]);

  const filteredSimulatedFollowing = useMemo(() => {
    if (!searchQuery.trim()) return simulatedFollowing;
    const query = searchQuery.toLowerCase().trim();
    return simulatedFollowing.filter((f: any) =>
      f.simulatedLeader.displayName.toLowerCase().includes(query)
    );
  }, [simulatedFollowing, searchQuery]);

  const hasResults = filteredFollowing.length > 0 || filteredSimulatedFollowing.length > 0;

  const handleUnfollow = async (leaderId: string, isSimulated: boolean, displayName: string) => {
    if (!confirm(`Unfollow ${displayName}?`)) return;
    try {
      if (isSimulated) {
        await api.unfollowSimulatedLeader(leaderId);
      } else {
        await api.unfollowLeader(leaderId);
      }
      toast.success('Unfollowed');
      loadFollowing();
      onRefresh();
    } catch {
      toast.error('Failed');
    }
  };

  const handleToggleActive = async (leaderId: string, isSimulated: boolean, isActive: boolean) => {
    try {
      if (isSimulated) {
        await api.updateSimulatedLeaderFollowSettings(leaderId, { isActive: !isActive });
      } else {
        await api.updateFollowSettings(leaderId, { isActive: !isActive });
      }
      toast.success(isActive ? 'Paused' : 'Resumed');
      loadFollowing();
    } catch {
      toast.error('Failed');
    }
  };

  const handleUpdateSettings = async (leaderId: string, isSimulated: boolean, settings: UpdateFollowSettingsInput) => {
    try {
      if (isSimulated) {
        await api.updateSimulatedLeaderFollowSettings(leaderId, settings);
      } else {
        await api.updateFollowSettings(leaderId, settings);
      }
      toast.success('Saved');
      setEditingId(null);
      loadFollowing();
    } catch {
      toast.error('Failed');
    }
  };

  const totalFollowing = following.length + simulatedFollowing.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (totalFollowing === 0) {
    return (
      <div className="text-center py-12">
        <Star className="h-10 w-10 text-slate-700 mx-auto" />
        <p className="text-slate-500 text-sm mt-2">Not following anyone</p>
        <p className="text-slate-600 text-xs mt-1">Discover leaders to follow</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search followed leaders..."
          className="w-full pl-8 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>

      {!hasResults ? (
        <div className="text-center py-8">
          <Star className="h-8 w-8 text-slate-700 mx-auto" />
          <p className="text-slate-500 text-sm mt-2">No matches found</p>
        </div>
      ) : (
        <>
          {filteredFollowing.map((follow: any) => (
            <FollowingCard
              key={follow.id}
              id={follow.id}
              leaderId={follow.leaderId}
              displayName={follow.leader.displayName}
              winRate={follow.leader.winRate}
              isActive={follow.isActive}
              isSimulated={false}
              copyMode={follow.copyMode}
              percentageAmount={follow.percentageAmount}
              fixedAmount={follow.fixedAmount}
              dailyLossLimit={follow.dailyLossLimit}
              dailyProfitLimit={follow.dailyProfitLimit}
              maxDailyTrades={follow.maxDailyTrades}
              unlimitedTrades={follow.unlimitedTrades}
              isEditing={editingId === follow.id}
              onEdit={() => setEditingId(editingId === follow.id ? null : follow.id)}
              onUnfollow={() => handleUnfollow(follow.leaderId, false, follow.leader.displayName)}
              onToggleActive={() => handleToggleActive(follow.leaderId, false, follow.isActive)}
              onUpdateSettings={(settings) => handleUpdateSettings(follow.leaderId, false, settings)}
            />
          ))}

          {filteredSimulatedFollowing.map((follow: any) => (
            <FollowingCard
              key={follow.id}
              id={follow.id}
              leaderId={follow.simulatedLeaderId}
              displayName={follow.simulatedLeader.displayName}
              winRate={follow.simulatedLeader.winRate}
              isActive={follow.isActive}
              isSimulated={true}
              copyMode={follow.copyMode}
              percentageAmount={follow.percentageAmount}
              fixedAmount={follow.fixedAmount}
              dailyLossLimit={follow.dailyLossLimit}
              dailyProfitLimit={follow.dailyProfitLimit}
              maxDailyTrades={follow.maxDailyTrades}
              unlimitedTrades={follow.unlimitedTrades}
              isEditing={editingId === `sim-${follow.id}`}
              onEdit={() => setEditingId(editingId === `sim-${follow.id}` ? null : `sim-${follow.id}`)}
              onUnfollow={() => handleUnfollow(follow.simulatedLeaderId, true, follow.simulatedLeader.displayName)}
              onToggleActive={() => handleToggleActive(follow.simulatedLeaderId, true, follow.isActive)}
              onUpdateSettings={(settings) => handleUpdateSettings(follow.simulatedLeaderId, true, settings)}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface FollowingCardProps {
  id: string;
  leaderId: string;
  displayName: string;
  winRate: number;
  isActive: boolean;
  isSimulated: boolean;
  copyMode: string;
  percentageAmount: number;
  fixedAmount: number;
  dailyLossLimit: number | null;
  dailyProfitLimit: number | null;
  maxDailyTrades: number | null;
  unlimitedTrades: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onUnfollow: () => void;
  onToggleActive: () => void;
  onUpdateSettings: (settings: UpdateFollowSettingsInput) => void;
}

function FollowingCard({
  leaderId,
  displayName,
  winRate,
  isActive,
  copyMode: initialCopyMode,
  percentageAmount: initialPercentage,
  fixedAmount: initialFixed,
  dailyLossLimit: initialLossLimit,
  dailyProfitLimit: initialProfitLimit,
  maxDailyTrades: initialMaxTrades,
  unlimitedTrades: initialUnlimited,
  isEditing,
  onEdit,
  onUnfollow,
  onToggleActive,
  onUpdateSettings,
}: FollowingCardProps) {
  const [copyMode, setCopyMode] = useState<CopyMode>(initialCopyMode as CopyMode);
  const [percentageAmount, setPercentageAmount] = useState(initialPercentage || 100);
  const [fixedAmount, setFixedAmount] = useState(initialFixed || 10);
  const [dailyLossLimit, setDailyLossLimit] = useState<number | null>(initialLossLimit);
  const [dailyProfitLimit, setDailyProfitLimit] = useState<number | null>(initialProfitLimit);
  const [maxDailyTrades, setMaxDailyTrades] = useState(initialMaxTrades || 50);
  const [unlimitedTrades, setUnlimitedTrades] = useState(initialUnlimited || false);

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

  const isPercentageMode = initialCopyMode === 'PERCENTAGE';

  return (
    <div className={cn(
      'bg-slate-800/30 rounded-lg overflow-hidden',
      !isActive && 'opacity-60'
    )}>
      {/* Main Row */}
      <div className="flex items-center gap-2 p-2">
        <div className="relative flex-shrink-0">
          <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-xs bg-gradient-to-br from-emerald-500 to-blue-500">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {getOnlineStatus(leaderId) && (
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-slate-900 rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-white font-medium text-xs truncate">{displayName}</h3>
            {!isActive && (
              <span className="px-1 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] rounded font-medium">
                PAUSED
              </span>
            )}
          </div>
          <p className="text-slate-600 text-[10px]">
            {isPercentageMode ? `${initialPercentage}%` : `$${initialFixed}`} · {winRate.toFixed(0)}% win
          </p>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onToggleActive}
            className={cn(
              'p-1.5 rounded transition-colors',
              isActive ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
            )}
            title={isActive ? 'Pause' : 'Resume'}
          >
            {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onEdit}
            className={cn(
              'p-1.5 rounded transition-colors',
              isEditing ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'
            )}
            title="Settings"
          >
            {isEditing ? <X className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onUnfollow}
            className="p-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors"
            title="Unfollow"
          >
            <UserMinus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div className="p-3 border-t border-slate-700/50 space-y-3 bg-slate-900/50">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setCopyMode('PERCENTAGE')}
              className={cn(
                'flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs transition-all',
                copyMode === 'PERCENTAGE'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 text-slate-400'
              )}
            >
              <Percent className="h-3 w-3" />
              Percentage
            </button>
            <button
              onClick={() => setCopyMode('FIXED_AMOUNT')}
              className={cn(
                'flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs transition-all',
                copyMode === 'FIXED_AMOUNT'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700 text-slate-400'
              )}
            >
              <DollarSign className="h-3 w-3" />
              Fixed
            </button>
          </div>

          {/* Amount Input */}
          {copyMode === 'PERCENTAGE' ? (
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Percentage</label>
              <div className="relative">
                <input
                  type="number"
                  value={percentageAmount}
                  onChange={(e) => setPercentageAmount(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 pr-8 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] text-slate-500 mb-1 block">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    value={fixedAmount}
                    onChange={(e) => setFixedAmount(Number(e.target.value))}
                    min={1}
                    max={10000}
                    className="w-full pl-7 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Loss limit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <input
                      type="number"
                      value={dailyLossLimit ?? ''}
                      onChange={(e) => setDailyLossLimit(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                      placeholder="None"
                      className="w-full pl-7 pr-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Profit limit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                    <input
                      type="number"
                      value={dailyProfitLimit ?? ''}
                      onChange={(e) => setDailyProfitLimit(e.target.value ? Number(e.target.value) : null)}
                      min={1}
                      placeholder="None"
                      className="w-full pl-7 pr-2 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Max Daily Trades */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-500">Max trades/day</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unlimitedTrades}
                  onChange={(e) => setUnlimitedTrades(e.target.checked)}
                  className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <Infinity className="h-2.5 w-2.5" /> Unlimited
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
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
