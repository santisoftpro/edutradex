'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Users,
  Star,
  TrendingUp,
  Trophy,
  Loader2,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FollowLeaderModal } from '@/components/copy-trading/FollowLeaderModal';
import { FollowSimulatedLeaderModal } from '@/components/copy-trading/FollowSimulatedLeaderModal';
import { useFakeActivity } from '@/hooks/useFakeActivity';
import type { CopyTradingStats, CopyTradingLeader, SimulatedLeaderForDisplay } from '@/types';

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
}

export function DesktopCopyTradingPanel({ isOpen, onClose }: DesktopCopyTradingPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [stats, setStats] = useState<CopyTradingStats | null>(null);
  const [realLeaders, setRealLeaders] = useState<CopyTradingLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('totalProfit');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Follow modal state
  const [selectedLeader, setSelectedLeader] = useState<CopyTradingLeader | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedSimulatedLeader, setSelectedSimulatedLeader] = useState<SimulatedLeaderForDisplay | null>(null);
  const [showSimulatedFollowModal, setShowSimulatedFollowModal] = useState(false);
  const [followingSimulatedIds, setFollowingSimulatedIds] = useState<Set<string>>(new Set());

  // Following counts
  const [realFollowingCount, setRealFollowingCount] = useState(0);
  const [simulatedFollowingCount, setSimulatedFollowingCount] = useState(0);

  // Simulated leaders
  const {
    isEnabled: fakeActivityEnabled,
    simulatedLeaders,
    animatedStats,
    isLoading: isLoadingSimulated,
  } = useFakeActivity();

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getCopyTradingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadLeaders = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.discoverLeaders({ sortBy, sortOrder: 'desc' });
      setRealLeaders(data.leaders || []);
    } catch (error) {
      console.error('Failed to load leaders:', error);
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
    } catch (error) {
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
    } catch (error) {
      console.error('Failed to load following counts:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      loadLeaders();
      loadSimulatedFollowingIds();
      loadFollowingCounts();
    }
  }, [isOpen, loadStats, loadLeaders, loadSimulatedFollowingIds, loadFollowingCounts]);

  // Merge and sort leaders
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
          };
        })
      : [];

    const combined = [...realDisplay, ...simulatedDisplay];

    combined.sort((a, b) => {
      switch (sortBy) {
        case 'winRate':
          return b.winRate - a.winRate;
        case 'totalProfit':
          return b.totalProfit - a.totalProfit;
        case 'totalTrades':
          return b.totalTrades - a.totalTrades;
        case 'followers':
          return b.followerCount - a.followerCount;
        default:
          return 0;
      }
    });

    return combined;
  }, [realLeaders, simulatedLeaders, animatedStats, fakeActivityEnabled, sortBy, followingSimulatedIds]);

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
    loadStats();
    loadFollowingCounts();
    toast.success('Successfully followed leader!');
  };

  const handleSimulatedFollowSuccess = () => {
    setShowSimulatedFollowModal(false);
    setSelectedSimulatedLeader(null);
    loadSimulatedFollowingIds();
    loadStats();
    loadFollowingCounts();
    toast.success('Successfully followed leader!');
  };

  const sortOptions = [
    { value: 'totalProfit' as SortOption, label: 'By Profit' },
    { value: 'winRate' as SortOption, label: 'By Win Rate' },
    { value: 'totalTrades' as SortOption, label: 'By Trades' },
    { value: 'followers' as SortOption, label: 'By Followers' },
  ];

  if (!isOpen) return null;

  const isPageLoading = isLoading || isLoadingSimulated;

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className="hidden lg:block fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel - slides in from right, below header, full remaining height */}
      <div className="hidden lg:flex fixed right-[68px] top-16 bottom-0 z-50 w-80 bg-[#1a1a2e] border-l border-[#2d2d44] flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2d44]">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-400" />
            <h2 className="text-white font-semibold text-sm">Copy Trading</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#252542] rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="px-3 py-2 border-b border-[#2d2d44]">
          <div className="grid grid-cols-4 gap-1.5">
            <StatItem icon={Users} label="Following" value={stats?.leadersFollowing || 0} color="text-blue-400" />
            <StatItem icon={TrendingUp} label="Copied" value={stats?.totalCopied || 0} color="text-emerald-400" />
            <StatItem icon={Trophy} label="Win" value={`${stats?.winRate?.toFixed(0) || 0}%`} color="text-purple-400" />
            <StatItem
              icon={TrendingUp}
              label="Profit"
              value={`$${(stats?.totalProfit || 0).toFixed(0)}`}
              color={(stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 py-2 border-b border-[#2d2d44]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('discover')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'discover'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#252542] text-gray-400 hover:text-white'
              )}
            >
              Discover
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'following'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#252542] text-gray-400 hover:text-white'
              )}
            >
              Following ({realFollowingCount + simulatedFollowingCount})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'discover' && (
            <div className="p-3 space-y-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#252542] border border-[#3d3d5c] rounded-lg text-sm text-gray-300"
                >
                  <span>{sortOptions.find((o) => o.value === sortBy)?.label}</span>
                  <ChevronDown className={cn('h-4 w-4 transition-transform', showSortDropdown && 'rotate-180')} />
                </button>
                {showSortDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#252542] border border-[#3d3d5c] rounded-lg overflow-hidden z-10">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value);
                          setShowSortDropdown(false);
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-sm transition-colors',
                          sortBy === option.value
                            ? 'bg-emerald-600/20 text-emerald-400'
                            : 'text-gray-300 hover:bg-[#2d2d52]'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Leaders List */}
              {isPageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                </div>
              ) : allLeaders.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-10 w-10 text-gray-600 mx-auto" />
                  <p className="text-gray-400 text-sm mt-2">No leaders found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {allLeaders.slice(0, 15).map((leader) => (
                    <LeaderRow
                      key={leader.id}
                      leader={leader}
                      onClick={() => handleFollowClick(leader)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'following' && (
            <FollowingTab onRefresh={() => { loadStats(); loadFollowingCounts(); }} />
          )}
        </div>
      </div>

      {/* Follow Modals */}
      {showFollowModal && selectedLeader && (
        <FollowLeaderModal
          leader={selectedLeader}
          onClose={() => {
            setShowFollowModal(false);
            setSelectedLeader(null);
          }}
          onSuccess={handleFollowSuccess}
        />
      )}

      {showSimulatedFollowModal && selectedSimulatedLeader && (
        <FollowSimulatedLeaderModal
          leader={selectedSimulatedLeader}
          onClose={() => {
            setShowSimulatedFollowModal(false);
            setSelectedSimulatedLeader(null);
          }}
          onSuccess={handleSimulatedFollowSuccess}
        />
      )}
    </>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-[#252542]/50 rounded-lg p-1.5 text-center">
      <Icon className={cn('h-3 w-3 mx-auto', color)} />
      <p className="text-[9px] text-gray-500 mt-0.5">{label}</p>
      <p className={cn('text-xs font-bold', color)}>{value}</p>
    </div>
  );
}

function LeaderRow({ leader, onClick }: { leader: DisplayLeader; onClick: () => void }) {
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
      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#252542] transition-colors text-left"
    >
      {/* Avatar */}
      <div className={cn(
        'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
        leader.isSimulated
          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
          : 'bg-gradient-to-br from-emerald-500 to-blue-500'
      )}>
        {leader.displayName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium text-xs truncate">{leader.displayName}</h3>
        <p className="text-gray-500 text-[10px]">
          {leader.totalTrades} trades
        </p>
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0">
        <p className={cn(
          'font-semibold text-xs transition-all',
          leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
          animateProfit && 'scale-110'
        )}>
          {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
        <p className="text-gray-500 text-[10px]">{leader.winRate.toFixed(0)}% win</p>
      </div>

      {/* Following indicator */}
      {leader.isFollowing && (
        <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
      )}
    </button>
  );
}

function FollowingTab({ onRefresh }: { onRefresh: () => void }) {
  const [following, setFollowing] = useState<any[]>([]);
  const [simulatedFollowing, setSimulatedFollowing] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfollow = async (leaderId: string, isSimulated: boolean, displayName: string) => {
    if (!confirm(`Unfollow ${displayName}?`)) return;
    try {
      if (isSimulated) {
        await api.unfollowSimulatedLeader(leaderId);
      } else {
        await api.unfollowLeader(leaderId);
      }
      toast.success(`Unfollowed ${displayName}`);
      loadFollowing();
      onRefresh();
    } catch (error) {
      toast.error('Failed to unfollow');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const totalFollowing = following.length + simulatedFollowing.length;

  if (totalFollowing === 0) {
    return (
      <div className="p-3 text-center py-8">
        <Star className="h-10 w-10 text-gray-600 mx-auto" />
        <p className="text-gray-400 text-sm mt-2">Not following anyone</p>
        <p className="text-gray-500 text-xs mt-1">Discover leaders to follow</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1">
      {/* Real Leaders */}
      {following.map((follow: any) => (
        <FollowingRow
          key={follow.id}
          displayName={follow.leader.displayName}
          winRate={follow.leader.winRate}
          totalProfit={follow.totalProfit}
          isSimulated={false}
          isActive={follow.isActive}
          onUnfollow={() => handleUnfollow(follow.leaderId, false, follow.leader.displayName)}
        />
      ))}

      {/* Simulated Leaders */}
      {simulatedFollowing.map((follow: any) => (
        <FollowingRow
          key={follow.id}
          displayName={follow.simulatedLeader.displayName}
          winRate={follow.simulatedLeader.winRate}
          totalProfit={follow.simulatedLeader.totalProfit}
          isSimulated={true}
          isActive={follow.isActive}
          onUnfollow={() => handleUnfollow(follow.simulatedLeaderId, true, follow.simulatedLeader.displayName)}
        />
      ))}
    </div>
  );
}

function FollowingRow({
  displayName,
  winRate,
  totalProfit,
  isSimulated,
  isActive,
  onUnfollow,
}: {
  displayName: string;
  winRate: number;
  totalProfit: number;
  isSimulated: boolean;
  isActive: boolean;
  onUnfollow: () => void;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2.5 p-2 rounded-lg',
      isActive ? 'bg-[#252542]/30' : 'bg-amber-600/10'
    )}>
      {/* Avatar */}
      <div className={cn(
        'h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
        isSimulated
          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
          : 'bg-gradient-to-br from-emerald-500 to-blue-500'
      )}>
        {displayName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-white font-medium text-xs truncate">{displayName}</h3>
          {!isActive && (
            <span className="px-1 py-0.5 bg-amber-600/20 text-amber-400 text-[8px] rounded">Paused</span>
          )}
        </div>
        <p className="text-gray-500 text-[10px]">{winRate.toFixed(0)}% win rate</p>
      </div>

      {/* Unfollow */}
      <button
        onClick={onUnfollow}
        className="px-2 py-1 text-[10px] text-red-400 hover:bg-red-600/20 rounded transition-colors"
      >
        Unfollow
      </button>
    </div>
  );
}
