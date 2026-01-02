'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  History,
  BarChart3,
  Settings,
  MessageSquare,
  Shield,
  Wallet,
  ArrowUpFromLine,
  Receipt,
  Users,
  Gift,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  TrendingUp,
  BadgeDollarSign,
  UserCircle,
  HelpCircle,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Trading',
    items: [
      { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
      { href: '/dashboard/demo-trade', label: 'Demo Trade', icon: LineChart, badge: 'DEMO' },
      { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Users },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
      { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
      { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { href: '/dashboard/history', label: 'Trade History', icon: History },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Rewards',
    items: [
      { href: '/dashboard/affiliate', label: 'Affiliate Program', icon: Gift },
    ],
  },
];

const accountItems: NavItem[] = [
  { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/support', label: 'Help & Support', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const balance = user?.demoBalance ?? 0;

  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!mounted) {
    return (
      <aside className="hidden md:flex w-64 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex-col h-full" />
    );
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-full bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700/50 transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* User Profile Card */}
      <div className={cn(
        'mx-3 mt-4 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/30',
        isCollapsed ? 'p-2' : 'p-4'
      )}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={handleToggleCollapse}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#1079ff] to-[#092ab2] flex items-center justify-center shadow-lg shadow-[#1079ff]/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="text-[#1079ff] text-xs font-bold">
              ${(balance / 1000).toFixed(1)}k
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#1079ff] to-[#092ab2] flex items-center justify-center shadow-lg shadow-[#1079ff]/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{user?.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1079ff]/20 text-[#1079ff] uppercase tracking-wide">
                    Real Account
                  </span>
                </div>
              </div>
              <button
                onClick={handleToggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Balance Display */}
            <div className="mt-3 p-3 rounded-lg bg-slate-900/50 border border-slate-600/20">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Available Balance</span>
                <TrendingUp className="h-3.5 w-3.5 text-[#1079ff]" />
              </div>
              <p className="mt-1 text-xl font-bold text-white tracking-tight">
                {formatCurrency(balance)}
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 mt-3">
              <Link
                href="/dashboard/deposit"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-sm font-medium transition-all shadow-lg shadow-[#1079ff]/20"
              >
                <BadgeDollarSign className="h-4 w-4" />
                <span>Deposit</span>
              </Link>
              <Link
                href="/dashboard/withdraw"
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition-colors"
              >
                <ArrowUpFromLine className="h-4 w-4" />
                <span>Withdraw</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        {isCollapsed ? (
          <div className="space-y-2">
            {navigationSections.flatMap((section) =>
              section.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-[#1079ff]/20 text-[#1079ff]'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    )}
                    title={item.label}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1079ff] rounded-r-full" />
                    )}
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-3 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveRoute(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                          isActive
                            ? 'bg-[#1079ff]/15 text-[#1079ff]'
                            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1079ff] rounded-r-full" />
                        )}
                        <div className={cn(
                          'flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                          isActive
                            ? 'bg-[#1079ff]/20'
                            : 'bg-slate-700/30 group-hover:bg-slate-700/50'
                        )}>
                          <Icon className="h-[18px] w-[18px]" />
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-[#1079ff]/20 text-[#1079ff] rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Account Section */}
      <div className="flex-shrink-0 border-t border-slate-700/50">
        <div className={cn('py-3', isCollapsed ? 'px-2' : 'px-3')}>
          {isCollapsed ? (
            <div className="space-y-2">
              {accountItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all duration-200"
                  title="Admin Panel"
                >
                  <Shield className="h-5 w-5" />
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    )}
                  >
                    <div className={cn(
                      'flex items-center justify-center h-8 w-8 rounded-lg transition-colors',
                      isActive
                        ? 'bg-slate-600'
                        : 'bg-slate-700/30 group-hover:bg-slate-700/50'
                    )}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-900/20 group-hover:bg-red-900/30 transition-colors">
                    <Shield className="h-[18px] w-[18px]" />
                  </div>
                  <span className="font-medium text-sm">Admin Panel</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Logout Button - Expanded Mode Only */}
        {!isCollapsed && (
          <div className="px-3 pb-4">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/30 text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
