'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  History,
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  Wallet,
  ArrowUpFromLine,
  Receipt,
  Users,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
  { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Users },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  { href: '/dashboard/history', label: 'Trade History', icon: History },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/affiliate', label: 'Affiliate', icon: Gift },
];

const bottomItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/help', label: 'Help', icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="hidden md:flex w-64 bg-slate-800 border-r border-slate-700 flex-col h-full">
      {/* Scrollable nav area */}
      <nav className="flex-1 py-4 px-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Fixed bottom section */}
      <div className="flex-shrink-0 py-4 px-4 border-t border-slate-700">
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-400 hover:bg-red-900/30 hover:text-red-300"
            >
              <Shield className="h-5 w-5" />
              <span className="font-medium">Admin Panel</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
