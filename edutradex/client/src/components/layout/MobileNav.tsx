'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LineChart,
  Wallet,
  User,
  ArrowUpFromLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/settings', label: 'Profile', icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  // On trade page, don't render - trade page has its own MobileNav component
  const isTradePage = pathname === '/dashboard/trade';

  if (isTradePage) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-800 border-t border-slate-700 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors',
                isActive
                  ? 'text-emerald-400'
                  : 'text-slate-400 active:text-white'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-emerald-400')} />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute top-0 w-12 h-0.5 bg-emerald-400 rounded-b" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
