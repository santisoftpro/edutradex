'use client';

import { useState, useRef, useEffect } from 'react';
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
  Users,
  Receipt,
  Gift,
  TrendingUp,
  BadgeDollarSign,
  UserCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, cn } from '@/lib/utils';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { AccountSwitcher } from '@/components/trading/AccountSwitcher';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mobileNavSections: NavSection[] = [
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
  {
    title: 'Account',
    items: [
      { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard/support', label: 'Help & Support', icon: HelpCircle },
    ],
  },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, getActiveBalance } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';
  const balance = getActiveBalance();
  const isLiveMode = user?.activeAccountType === 'LIVE';
  const hideLogoOnMobile = pathname?.startsWith('/dashboard/trade');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!user) return null;

  return (
    <>
      <header className="h-14 md:h-16 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 flex items-center justify-between px-3 md:px-6 sticky top-0 z-40">
        {/* Left - Mobile Menu & Logo */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="OptigoBroker"
              width={32}
              height={32}
              className={cn(
                'h-7 w-7 md:h-8 md:w-8',
                hideLogoOnMobile ? 'hidden sm:block' : ''
              )}
            />
            <span className="hidden md:block text-lg font-bold text-white tracking-tight">
              OptigoBroker
            </span>
          </Link>
        </div>

        {/* Right - Balance, Notifications & Profile */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile Balance with Account Type */}
          <div className="md:hidden flex items-center gap-1.5">
            <div className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
              isLiveMode ? 'bg-emerald-500/20' : 'bg-amber-500/20'
            )}>
              <Wallet className={cn('h-4 w-4', isLiveMode ? 'text-emerald-400' : 'text-amber-400')} />
              <span className="text-white font-semibold text-sm">
                {formatCurrency(balance)}
              </span>
              <span className={cn(
                'text-[10px] font-bold px-1 py-0.5 rounded',
                isLiveMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
              )}>
                {isLiveMode ? 'LIVE' : 'DEMO'}
              </span>
            </div>
          </div>

          {/* Desktop Account Switcher & Deposit */}
          <div className="hidden md:flex items-center gap-3">
            <AccountSwitcher compact />
            <Link
              href="/dashboard/deposit"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-xs font-medium transition-all"
            >
              <BadgeDollarSign className="h-3.5 w-3.5" />
              <span>Deposit</span>
            </Link>
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-2 md:px-3 py-1.5 transition-all duration-200',
                showDropdown
                  ? 'bg-slate-700 ring-2 ring-[#1079ff]/30'
                  : 'hover:bg-slate-700/50'
              )}
            >
              <div className="h-8 w-8 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-full flex items-center justify-center shadow-lg shadow-[#1079ff]/20">
                <User className="h-4 w-4 text-white" />
              </div>
              <span className="hidden md:block text-white font-medium text-sm max-w-[120px] truncate">
                {user.name}
              </span>
              <ChevronDown className={cn(
                'hidden md:block h-4 w-4 text-slate-400 transition-transform duration-200',
                showDropdown && 'rotate-180'
              )} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-700/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info Section */}
                <div className="p-4 bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-b border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-full flex items-center justify-center shadow-lg shadow-[#1079ff]/20">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{user.name}</p>
                      <p className="text-sm text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="p-2">
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                  >
                    <UserCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">View Profile</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                  </Link>
                  <Link
                    href="/dashboard/support"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors"
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Help & Support</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="p-2 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {showMobileMenu && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          <div className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-gradient-to-b from-slate-800 to-slate-900 z-50 md:hidden flex flex-col animate-slide-in shadow-2xl">
            {/* Menu Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
              <Link
                href="/dashboard"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-2"
              >
                <Image src="/logo.png" alt="OptigoBroker" width={28} height={28} />
                <span className="text-lg font-bold text-white">OptigoBroker</span>
              </Link>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="mx-4 mt-4 rounded-xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600/30 p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#1079ff] to-[#092ab2] flex items-center justify-center shadow-lg shadow-[#1079ff]/20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{user.name}</p>
                  <p className="text-sm text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              {/* Balance Display with Account Type */}
              <div className={cn(
                'mt-3 p-3 rounded-lg border',
                isLiveMode
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Available Balance</span>
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                    isLiveMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
                  )}>
                    {isLiveMode ? 'LIVE' : 'DEMO'}
                  </span>
                </div>
                <p className={cn(
                  'mt-1 text-xl font-bold tracking-tight',
                  isLiveMode ? 'text-emerald-400' : 'text-amber-400'
                )}>
                  {formatCurrency(balance)}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <Link
                  href="/dashboard/deposit"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-sm font-medium transition-all shadow-lg shadow-[#1079ff]/20"
                >
                  <BadgeDollarSign className="h-4 w-4" />
                  <span>Deposit</span>
                </Link>
                <Link
                  href="/dashboard/withdraw"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium transition-colors"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  <span>Withdraw</span>
                </Link>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
              <div className="space-y-5">
                {mobileNavSections.map((section) => (
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
                            onClick={() => setShowMobileMenu(false)}
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
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {isAdmin && (
                  <div>
                    <h3 className="px-3 mb-2 text-[11px] font-semibold text-red-400/70 uppercase tracking-wider">
                      Administration
                    </h3>
                    <Link
                      href="/admin"
                      onClick={() => setShowMobileMenu(false)}
                      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-200"
                    >
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-900/20 group-hover:bg-red-900/30 transition-colors">
                        <Shield className="h-[18px] w-[18px]" />
                      </div>
                      <span className="font-medium text-sm">Admin Panel</span>
                    </Link>
                  </div>
                )}
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-slate-700/50">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-slate-700/30 text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium text-sm">Sign Out</span>
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
          animation: slide-in 0.25s ease-out;
        }
      `}</style>
    </>
  );
}
