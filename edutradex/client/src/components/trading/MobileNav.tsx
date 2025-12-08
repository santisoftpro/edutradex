'use client';

import { memo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Clock, Users, LayoutDashboard, LineChart } from 'lucide-react';
import { useTradeStore } from '@/store/trade.store';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onOpenTrades: () => void;
  onOpenCopyTrading?: () => void;
}

function MobileNavComponent({ onOpenTrades, onOpenCopyTrading }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeTrades } = useTradeStore();

  const isOnTradePage = pathname === '/dashboard/trade';
  const isOnCopyPage = pathname?.startsWith('/dashboard/copy-trading');
  const isOnDashboard = pathname === '/dashboard';

  const goToTrade = useCallback(() => router.push('/dashboard/trade'), [router]);
  const goToHome = useCallback(() => router.push('/dashboard'), [router]);

  const handleCopyClick = useCallback(() => {
    // If on trade page and callback provided, open sheet instead of navigating
    if (isOnTradePage && onOpenCopyTrading) {
      onOpenCopyTrading();
    } else {
      // Otherwise navigate to copy trading page (desktop behavior)
      router.push('/dashboard/copy-trading');
    }
  }, [isOnTradePage, onOpenCopyTrading, router]);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a12] safe-area-bottom">
      {/* Navigation Items */}
      <div className="flex items-center justify-around py-2 px-2 border-t border-[#1a1a2e]">
        {/* Trade Button - Active indicator for trade page */}
        <button
          onClick={goToTrade}
          className={cn(
            'flex flex-col items-center gap-1 py-1.5 px-4 min-w-[64px] rounded-lg transition-colors',
            isOnTradePage
              ? 'text-emerald-400 bg-emerald-500/10'
              : 'text-gray-400 hover:text-white active:text-white'
          )}
        >
          <LineChart className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-[11px] font-medium">Trade</span>
        </button>

        {/* My Trades Button */}
        <button
          onClick={onOpenTrades}
          className="flex flex-col items-center gap-1 py-1.5 px-4 min-w-[64px] rounded-lg text-gray-400 hover:text-white active:text-white transition-colors relative"
        >
          <div className="relative">
            <Clock className="h-5 w-5" strokeWidth={1.5} />
            {activeTrades.length > 0 && (
              <span className="absolute -top-1 -right-2.5 min-w-[16px] h-[16px] px-1 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeTrades.length}
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium">History</span>
        </button>

        {/* Copy Trading Button */}
        <button
          onClick={handleCopyClick}
          className={cn(
            'flex flex-col items-center gap-1 py-1.5 px-4 min-w-[64px] rounded-lg transition-colors',
            isOnCopyPage
              ? 'text-blue-400 bg-blue-500/10'
              : 'text-gray-400 hover:text-white active:text-white'
          )}
        >
          <Users className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-[11px] font-medium">Copy</span>
        </button>

        {/* Dashboard/Home Button */}
        <button
          onClick={goToHome}
          className={cn(
            'flex flex-col items-center gap-1 py-1.5 px-4 min-w-[64px] rounded-lg transition-colors',
            isOnDashboard
              ? 'text-white bg-white/10'
              : 'text-gray-400 hover:text-white active:text-white'
          )}
        >
          <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
          <span className="text-[11px] font-medium">Home</span>
        </button>
      </div>

      {/* Home Indicator Bar - iOS style */}
      <div className="flex justify-center pb-2 pt-1">
        <div className="w-[100px] h-[4px] bg-white/20 rounded-full" />
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent state changes
export const MobileNav = memo(MobileNavComponent);
