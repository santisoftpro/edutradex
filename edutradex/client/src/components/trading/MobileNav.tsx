'use client';

import { Clock, History, LayoutDashboard, Settings, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useTradeStore } from '@/store/trade.store';

interface MobileNavProps {
  onOpenTrades: () => void;
}

export function MobileNav({ onOpenTrades }: MobileNavProps) {
  const router = useRouter();
  const { activeTrades } = useTradeStore();

  const navItems = [
    {
      id: 'trades',
      icon: Clock,
      label: 'Trades',
      badge: activeTrades.length > 0 ? activeTrades.length : null,
      onClick: onOpenTrades,
    },
    {
      id: 'history',
      icon: History,
      label: 'History',
      onClick: () => router.push('/dashboard/history'),
    },
    {
      id: 'analytics',
      icon: BarChart2,
      label: 'Analytics',
      onClick: () => router.push('/dashboard/analytics'),
    },
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      onClick: () => router.push('/dashboard'),
    },
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      onClick: () => router.push('/dashboard/settings'),
    },
  ];

  return (
    <div className="md:hidden fixed top-12 left-0 right-0 z-40 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-[#2d2d44]">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 hover:text-white transition-colors relative"
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-blue-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
