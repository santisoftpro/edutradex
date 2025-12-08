'use client';

import { useState, useEffect } from 'react';
import { X, Users, Star, Trophy, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { CopyTradingStats } from '@/types';
import { DiscoverLeaders } from '@/components/copy-trading/DiscoverLeaders';
import { MyFollowing } from '@/components/copy-trading/MyFollowing';

interface MobileCopyTradingSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'discover' | 'following';

export function MobileCopyTradingSheet({ isOpen, onClose }: MobileCopyTradingSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [stats, setStats] = useState<CopyTradingStats | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const data = await api.getCopyTradingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load copy trading stats:', error);
    }
  };

  if (!isOpen || !isClient) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 md:hidden"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#1a1a2e] rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center py-1.5">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pb-2 border-b border-[#2d2d44]">
          <h2 className="text-white font-semibold text-sm">Copy Trading</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#252542] rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Stats Summary - Compact version for mobile */}
        <div className="px-3 py-2 border-b border-[#2d2d44]">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="flex flex-col items-center gap-0.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] text-slate-400">Following</span>
                <span className="text-xs font-bold text-white">{stats?.leadersFollowing || 0}</span>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="flex flex-col items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] text-slate-400">Copied</span>
                <span className="text-xs font-bold text-white">{stats?.totalCopied || 0}</span>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="flex flex-col items-center gap-0.5">
                <Trophy className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[10px] text-slate-400">Win Rate</span>
                <span className="text-xs font-bold text-white">{stats?.winRate?.toFixed(1) || 0}%</span>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="flex flex-col items-center gap-0.5">
                <TrendingUp className={cn('h-3.5 w-3.5', (stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')} />
                <span className="text-[10px] text-slate-400">Profit</span>
                <span className={cn('text-xs font-bold', (stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {(stats?.totalProfit || 0) >= 0 ? '+' : ''}${(stats?.totalProfit || 0).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 py-2 border-b border-[#2d2d44]">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('discover')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'discover'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Discover
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                activeTab === 'following'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300'
              )}
            >
              <Star className="h-3.5 w-3.5" />
              Following
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {activeTab === 'discover' && (
            <DiscoverLeaders onFollowSuccess={loadStats} />
          )}
          {activeTab === 'following' && (
            <MyFollowing onRefreshStats={loadStats} />
          )}
        </div>
      </div>
    </>
  );
}
