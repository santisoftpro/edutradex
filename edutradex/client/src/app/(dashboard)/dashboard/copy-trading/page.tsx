'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Trophy, Star, Clock, History } from 'lucide-react';
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

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getCopyTradingStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load copy trading stats:', error);
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
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-[#1079ff] text-white shadow-lg shadow-[#1079ff]/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
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
