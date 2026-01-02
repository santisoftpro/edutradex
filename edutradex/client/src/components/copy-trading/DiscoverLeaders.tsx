'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Loader2,
  Check,
  Activity,
  ChevronRight,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FollowLeaderModal } from './FollowLeaderModal';
import { FollowSimulatedLeaderModal } from './FollowSimulatedLeaderModal';
import { useFakeActivity, FakeActivity } from '@/hooks/useFakeActivity';
import type { CopyTradingLeader, SimulatedLeaderForDisplay } from '@/types';

type SortOption = 'winRate' | 'totalTrades' | 'totalProfit' | 'followers';

interface DisplayLeader {
  id: string;
  displayName: string;
  description: string | null;
  winRate: number;
  totalProfit: number;
  totalTrades: number;
  followerCount: number;
  isSimulated: boolean;
  isFollowing?: boolean;
  isOnline: boolean;
}

interface DiscoverLeadersProps {
  onFollowSuccess?: () => void;
}

export function DiscoverLeaders({ onFollowSuccess }: DiscoverLeadersProps) {
  const [realLeaders, setRealLeaders] = useState<CopyTradingLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('totalProfit');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeader, setSelectedLeader] = useState<CopyTradingLeader | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);

  const [selectedSimulatedLeader, setSelectedSimulatedLeader] = useState<SimulatedLeaderForDisplay | null>(null);
  const [showSimulatedFollowModal, setShowSimulatedFollowModal] = useState(false);
  const [followingSimulatedIds, setFollowingSimulatedIds] = useState<Set<string>>(new Set());

  const {
    isEnabled: fakeActivityEnabled,
    simulatedLeaders,
    activities,
    animatedStats,
    isLoading: isLoadingSimulated,
  } = useFakeActivity();

  const loadSimulatedFollowingIds = useCallback(async () => {
    try {
      const ids = await api.getMySimulatedLeaderFollowingIds();
      setFollowingSimulatedIds(new Set(ids));
    } catch {
      setFollowingSimulatedIds(new Set());
    }
  }, []);

  useEffect(() => {
    loadRealLeaders();
    loadSimulatedFollowingIds();
  }, [sortBy, loadSimulatedFollowingIds]);

  const loadRealLeaders = async () => {
    setIsLoading(true);
    try {
      const data = await api.discoverLeaders({ sortBy, sortOrder: 'desc' });
      setRealLeaders(data.leaders || []);
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        toast.error('Failed to load leaders');
      }
      setRealLeaders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getOnlineStatus = (id: string): boolean => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 3 !== 0;
  };

  const allLeaders = useMemo((): DisplayLeader[] => {
    const realDisplay: DisplayLeader[] = realLeaders.map((leader) => ({
      id: leader.id,
      displayName: leader.displayName,
      description: leader.description,
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
            description: leader.description,
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

  const filteredLeaders = useMemo(() => {
    if (!searchQuery.trim()) return allLeaders;
    const query = searchQuery.toLowerCase().trim();
    return allLeaders.filter((leader) =>
      leader.displayName.toLowerCase().includes(query)
    );
  }, [allLeaders, searchQuery]);

  const handleFollowClick = (leader: DisplayLeader) => {
    if (leader.isSimulated) {
      const simulatedLeader = simulatedLeaders.find((l) => l.id === leader.id);
      if (simulatedLeader) {
        setSelectedSimulatedLeader(simulatedLeader);
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
    loadRealLeaders();
    onFollowSuccess?.();
    toast.success('Successfully followed leader!');
  };

  const handleSimulatedFollowSuccess = () => {
    setShowSimulatedFollowModal(false);
    setSelectedSimulatedLeader(null);
    loadSimulatedFollowingIds();
    onFollowSuccess?.();
    toast.success('Successfully followed leader!');
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'totalProfit', label: 'Profit' },
    { value: 'winRate', label: 'Win Rate' },
    { value: 'totalTrades', label: 'Active' },
    { value: 'followers', label: 'Popular' },
  ];

  const isPageLoading = isLoading || isLoadingSimulated;

  return (
    <div className="space-y-4">
      {/* Live Activity Ticker */}
      {fakeActivityEnabled && activities.length > 0 && (
        <LiveActivityTicker activities={activities} />
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search leaders..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
        />
      </div>

      {/* Sort Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSortBy(option.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              sortBy === option.value
                ? 'bg-[#1079ff] text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Leaders List */}
      {isPageLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
        </div>
      ) : filteredLeaders.length === 0 ? (
        <div className="text-center py-20">
          <TrendingUp className="h-12 w-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-4">No leaders found</p>
          <p className="text-slate-500 text-sm mt-1">{searchQuery ? 'Try a different search' : 'Check back later'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLeaders.map((leader, index) => (
            <LeaderCard
              key={leader.id}
              leader={leader}
              rank={index + 1}
              onFollow={() => handleFollowClick(leader)}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}

function LiveActivityTicker({ activities }: { activities: FakeActivity[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activities.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.min(activities.length, 5));
    }, 4000);
    return () => clearInterval(interval);
  }, [activities.length]);

  const visibleActivities = activities.slice(0, 5);
  const currentActivity = visibleActivities[currentIndex];

  if (!currentActivity) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 rounded-xl">
      <div className="relative flex-shrink-0">
        <Activity className="h-4 w-4 text-[#1079ff]" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#1079ff] rounded-full animate-ping" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div key={currentActivity.id} className="animate-fade-in text-sm text-slate-300">
          {currentActivity.type === 'trade' ? (
            <>
              <span className="text-white font-medium">{currentActivity.leaderName}</span>
              {' opened '}
              <span className={currentActivity.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'}>
                {currentActivity.direction}
              </span>
              {' on '}
              <span className="text-blue-400">{currentActivity.symbol}</span>
            </>
          ) : (
            <>
              <span className="text-white font-medium">{currentActivity.userName}</span>
              {' followed '}
              <span className="text-[#1079ff]">{currentActivity.leaderName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaderCard({
  leader,
  rank,
  onFollow,
}: {
  leader: DisplayLeader;
  rank: number;
  onFollow: () => void;
}) {
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
      onClick={onFollow}
      className="w-full flex items-center gap-3 p-4 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl transition-all group"
    >
      {/* Rank */}
      <div className="w-6 text-center flex-shrink-0">
        <span className={cn(
          'text-sm font-bold',
          rank <= 3 ? 'text-amber-400' : 'text-slate-500'
        )}>
          {rank}
        </span>
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold bg-gradient-to-br from-[#1079ff] to-[#092ab2]">
          {leader.displayName.charAt(0).toUpperCase()}
        </div>
        {leader.isOnline && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium text-sm truncate">{leader.displayName}</h3>
          {leader.isFollowing && (
            <Check className="h-4 w-4 text-[#1079ff] flex-shrink-0" />
          )}
        </div>
        <p className="text-slate-500 text-xs">
          {leader.totalTrades} trades &middot; {leader.winRate.toFixed(0)}% win
        </p>
      </div>

      {/* Profit */}
      <div className="text-right flex-shrink-0">
        <p className={cn(
          'font-semibold text-sm transition-transform duration-300',
          leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
          animateProfit && 'scale-110'
        )}>
          {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
    </button>
  );
}
