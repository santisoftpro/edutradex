'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ScrollText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/admins', label: 'Admins', icon: Users },
  { href: '/superadmin/audit-logs', label: 'Logs', icon: ScrollText },
  { href: '/superadmin/settings', label: 'Settings', icon: Settings },
];

export function SuperAdminMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50">
      <div className="flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/superadmin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3 rounded-lg transition-colors',
                isActive
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
