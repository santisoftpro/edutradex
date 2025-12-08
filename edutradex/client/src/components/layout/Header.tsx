'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LogOut,
  User,
  ChevronDown,
  Wallet,
  Menu,
  X,
  LayoutDashboard,
  LineChart,
  History,
  BarChart3,
  Settings,
  HelpCircle,
  Shield,
  ArrowUpFromLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AccountDropdown } from './AccountDropdown';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/help', label: 'Help', icon: HelpCircle },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!user) return null;

  const balance = user.demoBalance ?? 0;
  const hideLogoOnMobile = pathname?.startsWith('/dashboard/trade');

  return (
    <>
      <header className="h-14 md:h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 md:px-6">
        {/* Left - Logo & Menu Button */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <Image
            src="/logo.png"
            alt="OptigoBroker"
            width={32}
            height={32}
            className={cn(
              'h-6 w-6 md:h-8 md:w-8',
              hideLogoOnMobile ? 'hidden sm:block' : ''
            )}
          />
          <span className="hidden sm:block text-lg md:text-xl font-bold text-white">OptigoBroker</span>
        </div>

        {/* Right - Balance, Notifications & Profile */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Account Dropdown - Desktop */}
          <div className="hidden md:block">
            <AccountDropdown />
          </div>

          {/* Mobile Balance Display */}
          <div className="md:hidden flex items-center gap-1.5 bg-slate-700/50 rounded-lg px-2 py-1.5">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <span className="text-white font-medium text-sm">
              {formatCurrency(balance)}
            </span>
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Dropdown - Desktop */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors"
            >
              <div className="h-8 w-8 bg-emerald-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <span className="text-white font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-slate-700 rounded-lg shadow-lg border border-slate-600 py-2 z-20">
                  <div className="px-4 py-2 border-b border-slate-600">
                    <p className="text-sm text-slate-400">Signed in as</p>
                    <p className="text-white font-medium truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-slate-600 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-800 z-50 md:hidden flex flex-col animate-slide-in">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="OptigoBroker" width={24} height={24} />
                <span className="text-lg font-bold text-white">OptigoBroker</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-emerald-600 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{user.name}</p>
                  <p className="text-sm text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Balance Display */}
              <div className="mt-3">
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-500" />
                    <span className="text-white font-medium">Balance</span>
                  </div>
                  <span className="text-emerald-500 font-bold">
                    {formatCurrency(balance)}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <Link
                  href="/dashboard/deposit"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex-1 text-center text-xs bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded transition-colors"
                >
                  Deposit
                </Link>
                <Link
                  href="/dashboard/withdraw"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex-1 text-center text-xs bg-purple-600 hover:bg-purple-700 text-white py-1.5 rounded transition-colors"
                >
                  Withdraw
                </Link>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <div className="px-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMobileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                  >
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Admin Panel</span>
                  </Link>
                )}
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}
