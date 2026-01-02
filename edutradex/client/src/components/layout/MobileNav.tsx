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
  HelpCircle,
  Shield,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const primaryNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/history', label: 'History', icon: History },
];

const moreNavSections: NavSection[] = [
  {
    title: 'Trading',
    items: [
      { href: '/dashboard/demo-trade', label: 'Demo Trade', icon: LineChart },
      { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Users },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
      { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Rewards',
    items: [
      { href: '/dashboard/affiliate', label: 'Affiliate', icon: Gift },
    ],
  },
  {
    title: 'Account',
    items: [
      { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
    ],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  // Hide on trade pages - they have their own navigation
  const isTradePage = pathname === '/dashboard/trade' || pathname === '/dashboard/demo-trade';
  if (isTradePage) {
    return null;
  }

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isMoreItemActive = moreNavSections.some((section) =>
    section.items.some((item) => isActiveRoute(item.href))
  );

  return (
    <>
      {/* More Menu Bottom Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />

          <div className="absolute bottom-0 left-0 right-0 bg-slate-900 rounded-t-2xl border-t border-slate-700/50 safe-area-bottom animate-in slide-in-from-bottom duration-200">
            {/* Handle Bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/50">
              <h3 className="text-white font-semibold text-lg">More Options</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Sections */}
            <div className="px-4 py-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-5">
                {moreNavSections.map((section) => (
                  <div key={section.title}>
                    <h4 className="px-2 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {section.title}
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActiveRoute(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setShowMoreMenu(false)}
                            className={cn(
                              'flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200',
                              isActive
                                ? 'bg-[#1079ff]/20 text-[#1079ff]'
                                : 'text-slate-400 hover:bg-slate-800 active:bg-slate-700 active:scale-95'
                            )}
                          >
                            <div className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                              isActive
                                ? 'bg-[#1079ff]/20'
                                : 'bg-slate-800'
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-center leading-tight">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isAdmin && (
                  <div>
                    <h4 className="px-2 mb-2 text-[11px] font-semibold text-red-400/70 uppercase tracking-wider">
                      Administration
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <Link
                        href="/admin"
                        onClick={() => setShowMoreMenu(false)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl text-red-400 hover:bg-red-900/20 active:bg-red-900/30 active:scale-95 transition-all duration-200"
                      >
                        <div className="h-10 w-10 rounded-xl bg-red-900/20 flex items-center justify-center">
                          <Shield className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium text-center">Admin</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800/50 md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-all duration-200 relative',
                  isActive
                    ? 'text-[#1079ff]'
                    : 'text-slate-500 active:text-slate-300'
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#1079ff] rounded-full" />
                )}
                <div className={cn(
                  'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
                  isActive && 'bg-[#1079ff]/15'
                )}>
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      isActive && 'scale-110'
                    )}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                </div>
                <span className={cn(
                  'text-[10px] font-medium transition-colors',
                  isActive && 'text-[#1079ff]'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full py-2 transition-all duration-200 relative',
              isMoreItemActive || showMoreMenu
                ? 'text-[#1079ff]'
                : 'text-slate-500 active:text-slate-300'
            )}
          >
            {isMoreItemActive && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-[#1079ff] rounded-full" />
            )}
            <div className={cn(
              'h-8 w-8 rounded-xl flex items-center justify-center transition-colors',
              isMoreItemActive && 'bg-[#1079ff]/15'
            )}>
              <MoreHorizontal
                className={cn(
                  'h-5 w-5 transition-transform duration-200',
                  isMoreItemActive && 'scale-110'
                )}
                strokeWidth={isMoreItemActive ? 2.5 : 1.5}
              />
            </div>
            <span className={cn(
              'text-[10px] font-medium transition-colors',
              isMoreItemActive && 'text-[#1079ff]'
            )}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
