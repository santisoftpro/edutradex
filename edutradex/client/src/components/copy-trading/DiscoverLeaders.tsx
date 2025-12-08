'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Filter,
  UserPlus,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { FollowLeaderModal } from './FollowLeaderModal';
import type { CopyTradingLeader } from '@/types';

type SortOption = 'winRate' | 'totalTrades' | 'totalProfit' | 'followers';

interface DiscoverLeadersProps {
  onFollowSuccess?: () => void;
}

export function DiscoverLeaders({ onFollowSuccess }: DiscoverLeadersProps) {
  const [leaders, setLeaders] = useState<CopyTradingLeader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('winRate');
  const [selectedLeader, setSelectedLeader] = useState<CopyTradingLeader | null>(null);
  const [showFollowModal, setShowFollowModal] = useState(false);

  useEffect(() => {
    loadLeaders();
  }, [sortBy]);

  const loadLeaders = async () => {
    setIsLoading(true);
    try {
      const data = await api.discoverLeaders({ sortBy, sortOrder: 'desc' });
      setLeaders(data.leaders);
    } catch (error) {
      console.error('Failed to load leaders:', error);
      toast.error('Failed to load leaders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowClick = (leader: CopyTradingLeader) => {
    setSelectedLeader(leader);
    setShowFollowModal(true);
  };

  const handleFollowSuccess = () => {
    setShowFollowModal(false);
    setSelectedLeader(null);
    loadLeaders();
    onFollowSuccess?.();
    toast.success('Successfully followed leader!');
  };

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'winRate', label: 'Win Rate' },
    { value: 'totalProfit', label: 'Total Profit' },
    { value: 'totalTrades', label: 'Total Trades' },
    { value: 'followers', label: 'Followers' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-slate-400 text-sm">Sort:</span>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm border-none focus:ring-2 focus:ring-emerald-500"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Leaders List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-center py-12 bg-slate-800 rounded-xl border border-slate-700">
          <Users className="h-12 w-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 mt-3">No leaders available</p>
          <p className="text-slate-500 text-sm mt-1">
            Check back later for approved leaders
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaders.map((leader) => (
            <LeaderCard
              key={leader.id}
              leader={leader}
              onFollow={() => handleFollowClick(leader)}
            />
          ))}
        </div>
      )}

      {/* Follow Modal */}
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
    </div>
  );
}

function LeaderCard({
  leader,
  onFollow,
}: {
  leader: CopyTradingLeader;
  onFollow: () => void;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-colors">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Avatar & name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {leader.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-medium text-sm truncate">{leader.displayName}</h3>
            <p className="text-slate-400 text-xs">Win {leader.winRate.toFixed(0)}% • {leader.totalTrades} trades</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className={leader.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {leader.totalProfit >= 0 ? '+' : ''}${leader.totalProfit.toFixed(0)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {leader.followerCount}
          </span>
        </div>

        {/* Action Button */}
        <div className="flex sm:ml-auto">
          {leader.isFollowing ? (
            <button
              disabled
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 text-xs rounded-lg font-medium"
            >
              <Check className="h-3.5 w-3.5" />
              Following
            </button>
          ) : (
            <button
              onClick={onFollow}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors font-medium"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Follow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
