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
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Copy Trading</h1>
          <p className="text-slate-400">
            Follow successful traders and copy their trades automatically
          </p>
        </div>
        <button
          onClick={loadStats}
          className={cn(
            'inline-flex items-center gap-2 self-start sm:self-auto px-3 py-2 rounded-lg transition-colors text-sm font-medium',
            'bg-slate-800 text-slate-200 hover:bg-slate-700'
          )}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Users}
          iconColor="text-blue-400"
          iconBg="bg-blue-600/20"
          label="Following"
          value={stats?.leadersFollowing || 0}
        />
        <StatCard
          icon={TrendingUp}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-600/20"
          label="Trades Copied"
          value={stats?.totalCopied || 0}
        />
        <StatCard
          icon={Trophy}
          iconColor="text-purple-400"
          iconBg="bg-purple-600/20"
          label="Win Rate"
          value={`${stats?.winRate?.toFixed(1) || 0}%`}
        />
        <StatCard
          icon={TrendingUp}
          iconColor={(stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
          iconBg={(stats?.totalProfit || 0) >= 0 ? 'bg-emerald-600/20' : 'bg-red-600/20'}
          label="Total Profit"
          value={`${(stats?.totalProfit || 0) >= 0 ? '+' : ''}$${(stats?.totalProfit || 0).toFixed(2)}`}
          valueClass={(stats?.totalProfit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700 pb-3">
        <div className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  valueClass,
}: {
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 md:p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div>
          <p className="text-slate-400 text-xs md:text-sm">{label}</p>
          <p className={cn('text-lg md:text-xl font-bold text-white', valueClass)}>{value}</p>
        </div>
      </div>
    </div>
  );
}
