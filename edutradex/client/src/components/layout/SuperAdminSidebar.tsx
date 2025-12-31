'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  ArrowLeft,
  ScrollText,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/admins', label: 'Manage Admins', icon: Users },
  { href: '/superadmin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/superadmin/settings', label: 'Settings', icon: Settings },
];

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 bg-slate-800 border-r border-slate-700 flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Image src="/logo.png" alt="OptigoBroker" width={40} height={40} />
            <Crown className="absolute -top-1 -right-1 h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className="font-bold text-white">SuperAdmin</h2>
            <p className="text-xs text-amber-400">System Control</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/superadmin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative',
                  isActive
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="py-6 px-4 border-t border-slate-700">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <Shield className="h-5 w-5" />
          <span className="font-medium">Admin Panel</span>
        </Link>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors mt-1"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to App</span>
        </Link>

        <div className="mt-6 p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-4 w-4 text-amber-400" />
            <p className="text-xs text-amber-400 text-center font-semibold">
              SuperAdmin Mode
            </p>
          </div>
          <p className="text-xs text-amber-300/80 text-center mt-1">
            Full system access
          </p>
        </div>
      </div>
    </aside>
  );
}
