'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  TrendingUp,
  ArrowLeft,
  Shield,
  Wallet,
  Percent,
  ArrowUpFromLine,
  CreditCard,
  Copy,
  FileCheck,
  MessageSquare,
  Activity,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/kyc', label: 'KYC Verification', icon: FileCheck, badgeKey: 'kyc' },
  { href: '/admin/deposits', label: 'Deposits', icon: Wallet, badgeKey: 'deposits' },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, badgeKey: 'withdrawals' },
  { href: '/admin/tickets', label: 'Support Tickets', icon: MessageSquare, badgeKey: 'tickets' },
  { href: '/admin/payment-methods', label: 'Payment Methods', icon: CreditCard },
  { href: '/admin/copy-trading', label: 'Copy Trading', icon: Copy, badgeKey: 'pendingLeaders' },
  { href: '/admin/markets', label: 'Markets', icon: TrendingUp },
  { href: '/admin/otc', label: 'OTC Markets', icon: Activity },
  { href: '/admin/spreads', label: 'Spreads', icon: Percent },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingLeaders, setPendingLeaders] = useState(0);
  const [pendingKYC, setPendingKYC] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  useEffect(() => {
    const fetchPendingCounts = async () => {
      try {
        const [depositStats, withdrawalCount, leadersCount, kycCount] = await Promise.all([
          api.getDepositStats(),
          api.getPendingWithdrawalsCount(),
          api.getPendingLeadersCount(),
          api.getPendingKYCCount(),
        ]);
        setPendingDeposits(depositStats.pending);
        setPendingWithdrawals(withdrawalCount);
        setPendingLeaders(leadersCount);
        setPendingKYC(kycCount);

        // Fetch ticket stats separately to avoid breaking the whole request
        try {
          const ticketRes = await api.get<{ success: boolean; data: { open: number } }>('/support/admin/stats');
          if (ticketRes.success && ticketRes.data) {
            setOpenTickets(ticketRes.data.open || 0);
          }
        } catch {
          // Tickets endpoint not available yet, ignore
        }
      } catch (error) {
        console.error('Failed to fetch pending counts:', error);
      }
    };

    fetchPendingCounts();
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="hidden md:flex w-64 bg-slate-800 border-r border-slate-700 flex-col">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="OptigoBroker" width={40} height={40} />
          <div>
            <h2 className="font-bold text-white">Admin Panel</h2>
            <p className="text-xs text-slate-400">OptigoBroker</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            const badgeCount = item.badgeKey === 'deposits' ? pendingDeposits :
                               item.badgeKey === 'withdrawals' ? pendingWithdrawals :
                               item.badgeKey === 'pendingLeaders' ? pendingLeaders :
                               item.badgeKey === 'kyc' ? pendingKYC :
                               item.badgeKey === 'tickets' ? openTickets : 0;
            const showBadge = badgeCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative',
                  isActive
                    ? 'bg-red-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium flex-1">{item.label}</span>
                {showBadge && (
                  <span className={cn(
                    'px-2 py-0.5 text-xs font-bold rounded-full',
                    isActive ? 'bg-white text-red-600' : 'bg-red-500 text-white animate-pulse'
                  )}>
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="py-6 px-4 border-t border-slate-700">
        {isSuperAdmin && (
          <Link
            href="/superadmin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-amber-400 hover:bg-amber-900/30 transition-colors mb-2"
          >
            <Crown className="h-5 w-5" />
            <span className="font-medium">SuperAdmin</span>
          </Link>
        )}

        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to App</span>
        </Link>

        <div className="mt-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg">
          <p className="text-xs text-red-400 text-center">
            Admin Mode
            <br />
            <span className="text-red-300">Handle with care</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
