'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  History,
  MoreHorizontal,
  X,
  Users,
  ArrowUpFromLine,
  Receipt,
  BarChart3,
  Gift,
  Settings,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const primaryNavItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/history', label: 'History', icon: History },
];

const moreNavItems = [
  { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Users },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/affiliate', label: 'Affiliate', icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/support', label: 'Support', icon: MessageSquare },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  // On trade page, don't render - trade page has its own navigation
  const isTradePage = pathname === '/dashboard/trade';
  if (isTradePage) {
    return null;
  }

  // Check if current path is in "more" items
  const isMoreItemActive = moreNavItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />

          {/* Menu Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl border-t border-slate-700 safe-area-bottom animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="text-white font-semibold">More</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="px-2 py-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMoreMenu(false)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors',
                        isActive
                          ? 'bg-emerald-600/20 text-emerald-400'
                          : 'text-slate-400 hover:bg-slate-800 active:bg-slate-700'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium text-center">{item.label}</span>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setShowMoreMenu(false)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl text-red-400 hover:bg-red-900/20 active:bg-red-900/30 transition-colors"
                  >
                    <Shield className="h-6 w-6" />
                    <span className="text-xs font-medium text-center">Admin</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 transition-colors relative',
                  isActive
                    ? 'text-emerald-400'
                    : 'text-slate-500 active:text-slate-300'
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full" />
                )}
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 flex-1 h-full py-2 transition-colors relative',
              isMoreItemActive || showMoreMenu
                ? 'text-emerald-400'
                : 'text-slate-500 active:text-slate-300'
            )}
          >
            {isMoreItemActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-400 rounded-full" />
            )}
            <MoreHorizontal className="h-5 w-5" strokeWidth={isMoreItemActive ? 2 : 1.5} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
