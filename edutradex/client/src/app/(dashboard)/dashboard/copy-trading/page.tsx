'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  TrendingUp,
  Trophy,
  Star,
  UserPlus,
  Clock,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { DiscoverLeaders } from '@/components/copy-trading/DiscoverLeaders';
import { MyFollowing } from '@/components/copy-trading/MyFollowing';
import { MyLeaderProfile } from '@/components/copy-trading/MyLeaderProfile';
import { PendingTrades } from '@/components/copy-trading/PendingTrades';
import type { CopyTradingStats } from '@/types';

type TabType = 'discover' | 'following' | 'leader' | 'pending';

export default function CopyTradingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [stats, setStats] = useState<CopyTradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getCopyTradingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load copy trading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'discover' as TabType, label: 'Discover Leaders', icon: Users },
    { id: 'following' as TabType, label: 'My Following', icon: Star },
    { id: 'leader' as TabType, label: 'Leader Profile', icon: Trophy },
    { id: 'pending' as TabType, label: 'Pending Trades', icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
          <p className="text-slate-400 mt-1">
            Follow successful traders and copy their trades automatically
          </p>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Following</p>
              <p className="text-xl font-bold text-white">
                {stats?.leadersFollowing || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Trades Copied</p>
              <p className="text-xl font-bold text-white">
                {stats?.totalCopied || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Trophy className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Win Rate</p>
              <p className="text-xl font-bold text-white">
                {stats?.winRate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              (stats?.totalProfit || 0) >= 0 ? 'bg-emerald-600/20' : 'bg-red-600/20'
            )}>
              <TrendingUp className={cn(
                'h-5 w-5',
                (stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              )} />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Profit</p>
              <p className={cn(
                'text-xl font-bold',
                (stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}>
                {(stats?.totalProfit || 0) >= 0 ? '+' : ''}${(stats?.totalProfit || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'discover' && <DiscoverLeaders onFollowSuccess={loadStats} />}
        {activeTab === 'following' && <MyFollowing onRefreshStats={loadStats} />}
        {activeTab === 'leader' && <MyLeaderProfile />}
        {activeTab === 'pending' && <PendingTrades onRefreshStats={loadStats} />}
      </div>
    </div>
  );
}
