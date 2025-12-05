'use client';

import { useRouter } from 'next/navigation';
import { Clock, History, Users, Hourglass, User } from 'lucide-react';
import { useTradeStore } from '@/store/trade.store';

interface MobileNavProps {
  onOpenTrades: () => void;
}

export function MobileNav({ onOpenTrades }: MobileNavProps) {
  const router = useRouter();
  const { activeTrades } = useTradeStore();

  const navItems = [
    {
      id: 'open-trades',
      icon: Clock,
      label: 'Open Trades',
      onClick: onOpenTrades,
      badge: activeTrades.length > 0 ? activeTrades.length : null,
    },
    {
      id: 'history',
      icon: History,
      label: 'History',
      onClick: () => router.push('/dashboard/history'),
    },
    {
      id: 'copy-trading',
      icon: Users,
      label: 'Copy Trading',
      onClick: () => router.push('/dashboard/copy-trading'),
    },
    {
      id: 'pending',
      icon: Hourglass,
      label: 'Pending',
      onClick: onOpenTrades,
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profile',
      onClick: () => router.push('/dashboard/settings'),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12]">
      {/* Navigation Items */}
      <div className="flex items-center justify-around py-2 px-1 border-t border-[#1a1a2e]">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex flex-col items-center gap-0.5 px-1 py-1 text-gray-500 hover:text-gray-300 active:text-white transition-colors relative min-w-0 flex-1"
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 bg-blue-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] leading-tight text-center whitespace-nowrap truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Home Indicator Bar - iOS style */}
      <div className="flex justify-center pb-2 pt-1">
        <div className="w-[134px] h-[5px] bg-white/30 rounded-full" />
      </div>
    </div>
  );
}
