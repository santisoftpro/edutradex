import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import type { SimulatedLeaderForDisplay } from '@/types';

// Trading symbols for fake trades
const TRADING_SYMBOLS = [
  'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD',
  'BTC/USD', 'ETH/USD', 'XRP/USD', 'SOL/USD', 'BNB/USD',
  'AAPL', 'TSLA', 'GOOGL', 'AMZN', 'MSFT', 'NVDA',
];

// Fake usernames for follow notifications
const FAKE_USERNAMES = [
  'Trader_Alex', 'CryptoKing', 'ForexMaster', 'BullRunner', 'ProfitHunter',
  'MarketWiz', 'SwingTrader', 'DayTrade_Pro', 'TechTrader', 'GoldRush',
  'SilverFox', 'BitLord', 'ChartMaster', 'RiskTaker', 'SafeHands',
  'QuickProfit', 'SteadyGains', 'MomentumX', 'TrendFollower', 'ScalpKing',
];

export interface FakeTradeActivity {
  id: string;
  type: 'trade';
  leaderName: string;
  leaderId: string;
  symbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  timestamp: Date;
}

export interface FakeFollowActivity {
  id: string;
  type: 'follow';
  userName: string;
  leaderName: string;
  leaderId: string;
  timestamp: Date;
}

export type FakeActivity = FakeTradeActivity | FakeFollowActivity;

// Animated stats for a simulated leader
export interface AnimatedLeaderStats {
  winRate: number;
  totalProfit: number;
  totalTrades: number;
  followerCount: number;
}

interface UseFakeActivityReturn {
  isEnabled: boolean;
  simulatedLeaders: SimulatedLeaderForDisplay[];
  activities: FakeActivity[];
  animatedStats: Map<string, AnimatedLeaderStats>;
  isLoading: boolean;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Get random item from array
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Get random number in range
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Get random float in range
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export function useFakeActivity(): UseFakeActivityReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [simulatedLeaders, setSimulatedLeaders] = useState<SimulatedLeaderForDisplay[]>([]);
  const [activities, setActivities] = useState<FakeActivity[]>([]);
  const [animatedStats, setAnimatedStats] = useState<Map<string, AnimatedLeaderStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const leadersRef = useRef<SimulatedLeaderForDisplay[]>([]);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep leaders ref updated
  useEffect(() => {
    leadersRef.current = simulatedLeaders;
  }, [simulatedLeaders]);

  // Fetch simulated leaders and check if enabled
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // First check if fake activity is enabled
        let isEnabledSetting = false;
        try {
          const settingData = await api.getCopyTradingFakeActivitySetting();
          isEnabledSetting = settingData.enabled;
        } catch {
          // If setting fetch fails, assume disabled
          isEnabledSetting = false;
        }

        setIsEnabled(isEnabledSetting);

        // Only fetch leaders if enabled
        if (isEnabledSetting) {
          try {
            const leadersData = await api.getActiveSimulatedLeaders();
            setSimulatedLeaders(leadersData);

            // Initialize animated stats with base values
            const initialStats = new Map<string, AnimatedLeaderStats>();
            leadersData.forEach((leader) => {
              initialStats.set(leader.id, {
                winRate: leader.winRate,
                totalProfit: leader.totalProfit,
                totalTrades: leader.totalTrades,
                followerCount: leader.followerCount,
              });
            });
            setAnimatedStats(initialStats);
          } catch (error) {
            console.error('Failed to load simulated leaders:', error);
            setSimulatedLeaders([]);
          }
        } else {
          setSimulatedLeaders([]);
          setAnimatedStats(new Map());
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Refresh every 60 seconds
    const refreshInterval = setInterval(loadData, 60000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Generate fake activity
  const generateActivity = useCallback(() => {
    const leaders = leadersRef.current;
    if (leaders.length === 0) return;

    const leader = randomItem(leaders);
    const isTrade = Math.random() < 0.7;

    if (isTrade) {
      const activity: FakeTradeActivity = {
        id: generateId(),
        type: 'trade',
        leaderName: leader.displayName,
        leaderId: leader.id,
        symbol: randomItem(TRADING_SYMBOLS),
        direction: Math.random() < 0.5 ? 'UP' : 'DOWN',
        amount: randomInt(25, 500),
        timestamp: new Date(),
      };

      setActivities((prev) => [activity, ...prev].slice(0, 15));
    } else {
      const activity: FakeFollowActivity = {
        id: generateId(),
        type: 'follow',
        userName: randomItem(FAKE_USERNAMES),
        leaderName: leader.displayName,
        leaderId: leader.id,
        timestamp: new Date(),
      };

      setActivities((prev) => [activity, ...prev].slice(0, 15));
    }
  }, []);

  // Animate stats within bounds
  const animateStats = useCallback(() => {
    const leaders = leadersRef.current;
    if (leaders.length === 0) return;

    setAnimatedStats((prev) => {
      const newStats = new Map(prev);

      leaders.forEach((leader) => {
        const current = newStats.get(leader.id);
        if (!current) return;

        const { bounds } = leader;

        // Small random changes within bounds
        const newWinRate = Math.max(
          bounds.winRate.min,
          Math.min(bounds.winRate.max, current.winRate + randomFloat(-0.5, 0.5))
        );

        const profitChange = randomFloat(-50, 100);
        const newProfit = Math.max(
          bounds.profit.min,
          Math.min(bounds.profit.max, current.totalProfit + profitChange)
        );

        const tradesChange = Math.random() < 0.3 ? 1 : 0;
        const newTrades = Math.max(
          bounds.trades.min,
          Math.min(bounds.trades.max, current.totalTrades + tradesChange)
        );

        const followerChange = Math.random() < 0.2 ? (Math.random() < 0.8 ? 1 : -1) : 0;
        const newFollowers = Math.max(
          bounds.followers.min,
          Math.min(bounds.followers.max, current.followerCount + followerChange)
        );

        newStats.set(leader.id, {
          winRate: Math.round(newWinRate * 10) / 10,
          totalProfit: Math.round(newProfit * 100) / 100,
          totalTrades: newTrades,
          followerCount: newFollowers,
        });
      });

      return newStats;
    });
  }, []);

  // Start activity generation when enabled
  useEffect(() => {
    if (!isEnabled || simulatedLeaders.length === 0) {
      if (activityIntervalRef.current) {
        clearTimeout(activityIntervalRef.current);
        activityIntervalRef.current = null;
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      return;
    }

    // Generate activity at random intervals
    const scheduleNextActivity = () => {
      const delay = randomInt(4000, 10000);
      activityIntervalRef.current = setTimeout(() => {
        generateActivity();
        scheduleNextActivity();
      }, delay);
    };

    // Start after short delay
    activityIntervalRef.current = setTimeout(() => {
      generateActivity();
      scheduleNextActivity();
    }, randomInt(2000, 4000));

    // Animate stats every 5-8 seconds
    statsIntervalRef.current = setInterval(animateStats, randomInt(5000, 8000));

    return () => {
      if (activityIntervalRef.current) {
        clearTimeout(activityIntervalRef.current);
      }
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [isEnabled, simulatedLeaders.length, generateActivity, animateStats]);

  return {
    isEnabled,
    simulatedLeaders,
    activities,
    animatedStats,
    isLoading,
  };
}
