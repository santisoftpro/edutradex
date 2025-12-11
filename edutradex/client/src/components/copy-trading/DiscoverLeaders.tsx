'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Users,
  TrendingUp,
  Search,
  UserPlus,
  Loader2,
  Check,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FollowLeaderModal } from './FollowLeaderModal';
import { FollowSimulatedLeaderModal } from './FollowSimulatedLeaderModal';
import { useFakeActivity, FakeActivity } from '@/hooks/useFakeActivity';
import type { CopyTradingLeader, SimulatedLeaderForDisplay } from '@/types';

type SortOption = 'winRate' | 'totalTrades' | 'totalProfit' | 'followers';

// Unified leader type for display
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
}

interface DiscoverLeadersProps {
  onFollowSuccess?: () => void;
}

export function DiscoverLeaders({ onFollowSuccess }: DiscoverLeadersProps) {
  const [realLeaders, setRealLeaders] = useState<CopyTradingLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('totalProfit');
  const [searchQuery, setSearchQuery] = useState('');
  const [minWinRate, setMinWinRate] = useState<number | null>(null);
  const [selectedLeader, setSelectedLeader] = useState<CopyTradingLeader | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Simulated leader follow state
  const [selectedSimulatedLeader, setSelectedSimulatedLeader] = useState<SimulatedLeaderForDisplay | null>(null);
  const [showSimulatedFollowModal, setShowSimulatedFollowModal] = useState(false);
  const [followingSimulatedIds, setFollowingSimulatedIds] = useState<Set<string>>(new Set());

  // Get simulated leaders and activity from hook
  const {
    isEnabled: fakeActivityEnabled,
    simulatedLeaders,
    activities,
    animatedStats,
    isLoading: isLoadingSimulated,
  } = useFakeActivity();

  // Load simulated leader following IDs
  const loadSimulatedFollowingIds = useCallback(async () => {
    try {
      const ids = await api.getMySimulatedLeaderFollowingIds();
      setFollowingSimulatedIds(new Set(ids));
    } catch (error) {
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
      console.error('Failed to load leaders:', error);
      if (error?.response?.status !== 401) {
        toast.error('Failed to load leaders');
      }
      setRealLeaders([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Merge and sort real + simulated leaders
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

  // Filter leaders
  const filteredLeaders = useMemo(() => {
    return allLeaders.filter((leader) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!leader.displayName.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (minWinRate !== null && leader.winRate < minWinRate) {
        return false;
      }
      return true;
    });
  }, [allLeaders, searchQuery, minWinRate]);

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
    { value: 'totalProfit', label: 'Top ranked by profit' },
    { value: 'winRate', label: 'Top ranked by win rate' },
    { value: 'totalTrades', label: 'Most active traders' },
    { value: 'followers', label: 'Most followed' },
  ];

  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label || '';

  const isPageLoading = isLoading || isLoadingSimulated;

  return (
    <div className="space-y-4">
      {/* Live Activity Ticker */}
      {fakeActivityEnabled && activities.length > 0 && (
        <LiveActivityTicker activities={activities} />
      )}

      {/* Sort Dropdown - Mobile Style */}
      <div className="relative">
        <button
          onClick={() => setShowSortDropdown(!showSortDropdown)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white"
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm">{currentSortLabel}</span>
          </div>
          <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', showSortDropdown && 'rotate-180')} />
        </button>
        {showSortDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-10">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setSortBy(option.value);
                  setShowSortDropdown(false);
                }}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm transition-colors',
                  sortBy === option.value
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-slate-300 hover:bg-slate-700'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search - Hidden on mobile, visible on desktop */}
      <div className="hidden sm:block relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search leaders..."
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Section Label */}
      <div className="text-center">
        <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
          Top Traders
        </span>
      </div>

      {/* Leaders List - Clean Mobile Design */}
      {isPageLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
        </div>
      ) : filteredLeaders.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <TrendingUp className="h-16 w-16 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-4 text-lg">No leaders found</p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery || minWinRate ? 'Try adjusting your search criteria' : 'Check back later for approved leaders'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredLeaders.map((leader) => (
            <LeaderCard
              key={leader.id}
              leader={leader}
              onFollow={() => handleFollowClick(leader)}
            />
          ))}
        </div>
      )}

      {/* Follow Modal for Real Leaders */}
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

      {/* Follow Modal for Simulated Leaders */}
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

// Live Activity Ticker Component
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
    <div className="bg-gradient-to-r from-emerald-900/30 via-slate-800/80 to-emerald-900/30 rounded-xl p-3 border border-emerald-700/30 overflow-hidden">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <span className="text-emerald-400 text-xs font-medium uppercase tracking-wide">Live</span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <div className="flex-1 overflow-hidden">
          <div key={currentActivity.id} className="animate-fade-in text-sm">
            {currentActivity.type === 'trade' ? (
              <span className="text-slate-300">
                <span className="text-white font-medium">{currentActivity.leaderName}</span>
                {' placed a '}
                <span className={cn(
                  'font-medium',
                  currentActivity.direction === 'UP' ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {currentActivity.direction === 'UP' ? 'BUY' : 'SELL'}
                </span>
                {' on '}
                <span className="text-blue-400 font-medium">{currentActivity.symbol}</span>
                {' for '}
                <span className="text-yellow-400 font-medium">${currentActivity.amount}</span>
              </span>
            ) : (
              <span className="text-slate-300">
                <span className="text-white font-medium">{currentActivity.userName}</span>
                {' just started following '}
                <span className="text-emerald-400 font-medium">{currentActivity.leaderName}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-slate-500 text-xs flex-shrink-0">
          {visibleActivities.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                idx === currentIndex ? 'bg-emerald-400' : 'bg-slate-600'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeaderCard({
  leader,
  onFollow,
}: {
  leader: DisplayLeader;
  onFollow: () => void;
}) {
  const prevProfitRef = useRef(leader.totalProfit);
  const [animateProfit, setAnimateProfit] = useState(false);

  // Animate on profit change
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
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors text-left"
    >
      {/* Avatar */}
      <div className={cn(
        'h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0',
        leader.isSimulated
          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
          : 'bg-gradient-to-br from-emerald-500 to-blue-500'
      )}>
        {leader.displayName.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium text-sm truncate">{leader.displayName}</h3>
        <p className="text-slate-500 text-xs">
          Number of trades: <span className="text-slate-400">{leader.totalTrades}</span>
        </p>
      </div>

      {/* Stats - Right Side */}
      <div className="text-right flex-shrink-0">
        <p className={cn(
          'font-semibold text-sm transition-all duration-300',
          leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400',
          animateProfit && 'scale-110'
        )}>
          {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-slate-500 text-xs">
          Profitable trades: <span className="text-slate-400">{leader.winRate.toFixed(0)}%</span>
        </p>
      </div>

      {/* Follow indicator for already followed */}
      {leader.isFollowing && (
        <div className="flex-shrink-0">
          <Check className="h-5 w-5 text-emerald-400" />
        </div>
      )}
    </button>
  );
}
