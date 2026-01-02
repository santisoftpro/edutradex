'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet,
  User,
  ChevronDown,
  LogOut,
  History,
  Settings,
  TrendingUp,
  TrendingDown,
  Menu,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  LayoutDashboard,
  LineChart,
  Users,
  Receipt,
  BarChart3,
  Gift,
  HelpCircle,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { AssetSelector } from './AssetSelector';
import { AccountSwitcher } from './AccountSwitcher';
import { PriceTick } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade', icon: LineChart },
  { href: '/dashboard/demo-trade', label: 'Demo Trade', icon: LineChart },
  { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Users },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  { href: '/dashboard/history', label: 'Trade History', icon: History },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/affiliate', label: 'Affiliate', icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
];

interface TradingHeaderProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice?: PriceTick | null;
  livePrices?: Map<string, PriceTick>;
  isDemoMode?: boolean;
}

export function TradingHeader({ selectedAsset, onSelectAsset, currentPrice, livePrices, isDemoMode = false }: TradingHeaderProps) {
  const router = useRouter();
  const { user, logout, getActiveBalance } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  if (!user) return null;

  const balance = getActiveBalance();
  const isLiveMode = user.activeAccountType === 'LIVE';
  const priceColor = currentPrice?.changePercent !== undefined && currentPrice.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400';
  const TrendIcon = currentPrice?.changePercent !== undefined && currentPrice.changePercent >= 0 ? TrendingUp : TrendingDown;

  return (
    <>
    <header className="h-12 md:h-14 bg-[#1a1a2e] border-b border-[#2d2d44] flex items-center justify-between px-2 md:px-4">
      {/* Left - Logo & Asset */}
      <div className="flex items-center gap-2 md:gap-6">
        {/* Hamburger menu for mobile */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="md:hidden p-1.5 hover:bg-[#252542] rounded-lg transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-400" />
        </button>

        {/* Logo - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <Image src="/logo.png" alt="OptigoBroker" width={32} height={32} className="h-8 w-8" />
          <span className="text-white font-bold hidden sm:block">OptigoBroker</span>
        </div>

        <AssetSelector
          selectedAsset={selectedAsset}
          onSelectAsset={onSelectAsset}
          currentPrice={currentPrice?.price}
          currentChange={currentPrice?.changePercent}
          livePrices={livePrices}
        />

        {/* Current Price Display - Visible on all screens, compact on mobile */}
        {currentPrice && (
          <div className="flex items-center gap-1 sm:gap-3 bg-[#252542] rounded-lg px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2">
            <div className="flex flex-col">
              <span className="text-white font-bold text-xs sm:text-sm md:text-lg">{currentPrice.price.toFixed(currentPrice.price > 100 ? 2 : 5)}</span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <TrendIcon className={`h-2.5 sm:h-3 w-2.5 sm:w-3 ${priceColor}`} />
                <span className={`text-[8px] sm:text-[10px] md:text-xs ${priceColor}`}>
                  {currentPrice.changePercent >= 0 ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right - Balance & User */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Account Switcher - replaces old balance dropdown */}
        <AccountSwitcher compact className="hidden md:block" />
        <AccountSwitcher compact className="md:hidden" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1 md:gap-2 hover:bg-[#252542] rounded-lg px-2 md:px-3 py-1.5 md:py-2 transition-colors"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-full flex items-center justify-center">
              <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
            </div>
            <ChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl z-50 py-2">
                <div className="px-4 py-3 border-b border-[#2d2d44]">
                  <p className="text-white font-medium">{user.name}</p>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    router.push('/dashboard');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-[#252542] hover:text-white transition-colors"
                >
                  <History className="h-4 w-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    router.push('/dashboard/settings');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:bg-[#252542] hover:text-white transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <div className="border-t border-[#2d2d44] my-2" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-[#252542] transition-colors"
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
              <div className="h-12 w-12 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.name}</p>
                <p className="text-sm text-slate-400 truncate">{user.email}</p>
              </div>
            </div>

            {/* Balance Display with Account Type */}
            <div className="mt-3">
              <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                isLiveMode
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'bg-amber-500/10 border border-amber-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  <Wallet className={`h-5 w-5 ${isLiveMode ? 'text-emerald-400' : 'text-amber-400'}`} />
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-sm">Balance</span>
                    <span className={`text-xs ${isLiveMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isLiveMode ? 'LIVE' : 'DEMO'}
                    </span>
                  </div>
                </div>
                <span className={`font-bold ${isLiveMode ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-3">
              <Link
                href="/dashboard/deposit"
                onClick={() => setShowMobileMenu(false)}
                className="flex-1 text-center text-xs bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white py-1.5 rounded transition-colors"
              >
                Deposit
              </Link>
              <Link
                href="/dashboard/withdraw"
                onClick={() => setShowMobileMenu(false)}
                className="flex-1 text-center text-xs bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-1.5 rounded transition-all"
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
    `}</style>
    </>
  );
}
