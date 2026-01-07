'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  LogOut,
  ChevronDown,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { UserAvatar, Dropdown, DropdownItem, DropdownHeader, Badge } from '@/components/ui';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const totalPending = pendingDeposits + pendingWithdrawals;

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

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
        <span className="text-lg md:text-xl font-bold text-white">OptigoBroker Admin</span>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="md:hidden p-2 text-slate-400 hover:text-white"
      >
        {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-4">
        {/* Notification Bell */}
        <Dropdown
          contentClassName="w-72"
          trigger={
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {totalPending > 9 ? '9+' : totalPending}
                </span>
              )}
            </button>
          }
        >
          <DropdownHeader className="flex items-center justify-between">
            <span className="font-semibold text-white">Notifications</span>
            {totalPending > 0 && (
              <Badge variant="error" size="sm">{totalPending} pending</Badge>
            )}
          </DropdownHeader>
          {totalPending > 0 ? (
            <div className="divide-y divide-slate-600">
              {pendingDeposits > 0 && (
                <Link
                  href="/admin/deposits"
                  className="block p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-900/50 rounded-lg shrink-0">
                      <Bell className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Pending Deposits</p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {pendingDeposits} deposit{pendingDeposits > 1 ? 's' : ''} awaiting approval
                      </p>
                    </div>
                  </div>
                </Link>
              )}
              {pendingWithdrawals > 0 && (
                <Link
                  href="/admin/withdrawals"
                  className="block p-4 hover:bg-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-900/50 rounded-lg shrink-0">
                      <Bell className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Pending Withdrawals</p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {pendingWithdrawals} withdrawal{pendingWithdrawals > 1 ? 's' : ''} awaiting approval
                      </p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400">
              No pending notifications
            </div>
          )}
        </Dropdown>

        <div className="hidden lg:flex items-center gap-2 bg-red-900/30 border border-red-900/50 rounded-lg px-4 py-2">
          <span className="text-red-400 font-medium text-sm">Administrator</span>
        </div>

        <Dropdown
          contentClassName="w-48"
          trigger={
            <button className="flex items-center gap-2 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors">
              <UserAvatar variant="admin" size="sm" />
              <span className="text-white font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          }
        >
          <DropdownHeader>
            <p className="text-sm text-slate-400">Signed in as</p>
            <p className="text-white font-medium truncate">{user.email}</p>
            <p className="text-xs text-red-400 mt-1">Admin Account</p>
          </DropdownHeader>
          <DropdownItem onClick={handleLogout} variant="danger">
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-16 right-0 left-0 z-50 bg-slate-800 border-b border-slate-700 md:hidden">
            <div className="p-4 space-y-3">
              {/* Pending Deposits Alert */}
              {pendingDeposits > 0 && (
                <Link
                  href="/admin/deposits"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 p-3 bg-amber-900/30 border border-amber-900/50 rounded-lg"
                >
                  <Bell className="h-5 w-5 text-amber-400" />
                  <div className="flex-1">
                    <p className="text-white font-medium">Pending Deposits</p>
                    <p className="text-xs text-amber-400">{pendingDeposits} awaiting approval</p>
                  </div>
                  <Badge variant="error" size="sm" className="animate-pulse">
                    {pendingDeposits}
                  </Badge>
                </Link>
              )}

              {/* Pending Withdrawals Alert */}
              {pendingWithdrawals > 0 && (
                <Link
                  href="/admin/withdrawals"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 p-3 bg-purple-900/30 border border-purple-900/50 rounded-lg"
                >
                  <Bell className="h-5 w-5 text-purple-400" />
                  <div className="flex-1">
                    <p className="text-white font-medium">Pending Withdrawals</p>
                    <p className="text-xs text-purple-400">{pendingWithdrawals} awaiting approval</p>
                  </div>
                  <Badge variant="error" size="sm" className="animate-pulse">
                    {pendingWithdrawals}
                  </Badge>
                </Link>
              )}

              {/* User Info */}
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar variant="admin" size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Badge variant="admin" size="sm">Admin</Badge>
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
