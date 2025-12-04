'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  ArrowUpFromLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const navItems = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/deposits', label: 'Deposits', icon: Wallet, badgeKey: 'deposits' },
  { href: '/admin/withdrawals', label: 'Withdraw', icon: ArrowUpFromLine, badgeKey: 'withdrawals' },
  { href: '/admin/markets', label: 'Markets', icon: TrendingUp },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        const [depositStats, withdrawalCount] = await Promise.all([
          api.getDepositStats(),
          api.getPendingWithdrawalsCount(),
        ]);
        setPendingDeposits(depositStats.pending);
        setPendingWithdrawals(withdrawalCount);
      } catch (error) {
        console.error('Failed to fetch pending counts:', error);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const badgeCount = item.badgeKey === 'deposits' ? pendingDeposits :
                             item.badgeKey === 'withdrawals' ? pendingWithdrawals : 0;
          const showBadge = badgeCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors',
                isActive
                  ? 'text-red-400'
                  : 'text-slate-400 active:text-white'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'text-red-400')} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 w-12 h-0.5 bg-red-400 rounded-b" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
