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
import { PriceTick } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
];

interface TradingHeaderProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice?: PriceTick | null;
  livePrices?: Map<string, PriceTick>;
}

export function TradingHeader({ selectedAsset, onSelectAsset, currentPrice, livePrices }: TradingHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  if (!user) return null;

  const balance = user.demoBalance ?? 0;
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
        {/* Balance with dropdown */}
        <div className="flex items-center gap-1.5 md:gap-3">
          <div className="relative">
            <button
              onClick={() => setShowBalanceMenu(!showBalanceMenu)}
              className="flex items-center gap-1.5 md:gap-2 bg-[#252542] hover:bg-[#2d2d52] rounded-lg px-2 md:px-4 py-1.5 md:py-2 transition-colors"
            >
              <Wallet className="h-3.5 md:h-4 w-3.5 md:w-4 text-emerald-500" />
              <span className="text-emerald-400 font-bold text-sm md:text-base">{formatCurrency(user.demoBalance)}</span>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>

            {showBalanceMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBalanceMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl z-50 py-2">
                  <div className="px-4 py-2 border-b border-[#2d2d44]">
                    <p className="text-gray-400 text-xs">Available Balance</p>
                    <p className="text-lg text-white font-bold">{formatCurrency(user.demoBalance)}</p>
                  </div>
                  <Link
                    href="/dashboard/deposit"
                    onClick={() => setShowBalanceMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <ArrowDownToLine className="h-4 w-4 text-emerald-500" />
                    Deposit
                  </Link>
                  <Link
                    href="/dashboard/withdraw"
                    onClick={() => setShowBalanceMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <ArrowUpFromLine className="h-4 w-4 text-orange-500" />
                    Withdraw
                  </Link>
                  <Link
                    href="/dashboard/transactions"
                    onClick={() => setShowBalanceMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <History className="h-4 w-4 text-blue-500" />
                    Transaction History
                  </Link>
                </div>
              </>
            )}
          </div>

          <span className="hidden md:inline text-emerald-500 text-xs px-2 py-1 bg-[#252542] rounded">LIVE</span>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1 md:gap-2 hover:bg-[#252542] rounded-lg px-2 md:px-3 py-1.5 md:py-2 transition-colors"
          >
            <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-600 rounded-full flex items-center justify-center">
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
    `}</style>
    </>
  );
}
