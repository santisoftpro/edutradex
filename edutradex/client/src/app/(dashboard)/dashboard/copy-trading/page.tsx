'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  TrendingUp,
  Trophy,
  Star,
  Clock,
  RefreshCw,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { DiscoverLeaders } from '@/components/copy-trading/DiscoverLeaders';
import { MyFollowing } from '@/components/copy-trading/MyFollowing';
import { MyLeaderProfile } from '@/components/copy-trading/MyLeaderProfile';
import { PendingTrades } from '@/components/copy-trading/PendingTrades';
import { CopyHistory } from '@/components/copy-trading/CopyHistory';
import type { CopyTradingStats } from '@/types';

type TabType = 'discover' | 'following' | 'history' | 'leader' | 'pending';

export default function CopyTradingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [stats, setStats] = useState<CopyTradingStats | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getCopyTradingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load copy trading stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPendingCount = useCallback(async () => {
    try {
      const data = await api.getPendingCopyTrades();
      setPendingCount(data.length);
    } catch (error) {
      console.error('Failed to load pending count:', error);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadPendingCount();

    // Refresh pending count every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, [loadStats, loadPendingCount]);

  const handleRefresh = () => {
    loadStats();
    loadPendingCount();
  };

  const tabs = [
    { id: 'discover' as TabType, label: 'Discover', icon: Users, badge: null },
    { id: 'following' as TabType, label: 'Following', icon: Star, badge: stats?.leadersFollowing || null },
    { id: 'history' as TabType, label: 'History', icon: History, badge: null },
    { id: 'leader' as TabType, label: 'Leader', icon: Trophy, badge: null },
    { id: 'pending' as TabType, label: 'Pending', icon: Clock, badge: pendingCount || null },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Copy Trading</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Follow successful traders and copy their trades
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-2 rounded-lg transition-colors text-sm font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          iconBg="bg-blue-500/20 text-blue-400"
          label="Following"
          value={stats?.leadersFollowing || 0}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-emerald-500/20 text-emerald-400"
          label="Trades Copied"
          value={stats?.totalCopied || 0}
        />
        <StatCard
          icon={Trophy}
          iconBg="bg-purple-500/20 text-purple-400"
          label="Win Rate"
          value={`${stats?.winRate?.toFixed(1) || 0}%`}
        />
        <StatCard
          icon={TrendingUp}
          iconBg={(stats?.totalProfit || 0) >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}
          label="Total Profit"
          value={`${(stats?.totalProfit || 0) >= 0 ? '+' : ''}$${(stats?.totalProfit || 0).toFixed(2)}`}
          valueClass={(stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative',
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.badge !== null && tab.badge > 0 && (
              <span className={cn(
                'min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold rounded-full',
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : tab.id === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-600 text-slate-200'
              )}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'discover' && <DiscoverLeaders onFollowSuccess={handleRefresh} />}
        {activeTab === 'following' && <MyFollowing onRefreshStats={handleRefresh} />}
        {activeTab === 'history' && <CopyHistory />}
        {activeTab === 'leader' && <MyLeaderProfile />}
        {activeTab === 'pending' && <PendingTrades onRefreshStats={handleRefresh} />}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  label,
  value,
  valueClass,
}: {
  icon: typeof Users;
  iconBg: string;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className={cn('text-lg font-bold text-white', valueClass)}>{value}</p>
        </div>
      </div>
    </div>
  );
}
