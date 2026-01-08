'use client';

import { useState, useRef, useEffect } from 'react';
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
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { useChartStore } from '@/store/chart.store';
import { AssetSelector } from './AssetSelector';
import { AccountSwitcher } from './AccountSwitcher';
import { PriceTick } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

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
  const { favoritePairs, removeFavoritePair } = useChartStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const favoritesScrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  // Check if scroll buttons are needed
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (favoritesScrollRef.current) {
        const { scrollWidth, clientWidth } = favoritesScrollRef.current;
        setShowScrollButtons(scrollWidth > clientWidth + 10);
      }
    };

    checkScrollNeeded();
    window.addEventListener('resize', checkScrollNeeded);
    return () => window.removeEventListener('resize', checkScrollNeeded);
  }, [favoritePairs.length]);

  const scrollFavorites = (direction: 'left' | 'right') => {
    if (favoritesScrollRef.current) {
      const scrollAmount = 150;
      favoritesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!user) return null;

  const balance = getActiveBalance();
  const isLiveMode = user.activeAccountType === 'LIVE';
  const priceColor = currentPrice?.changePercent !== undefined && currentPrice.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400';
  const TrendIcon = currentPrice?.changePercent !== undefined && currentPrice.changePercent >= 0 ? TrendingUp : TrendingDown;

  return (
    <>
    <header className="h-14 md:h-16 bg-gradient-to-r from-[#1a1a2e] to-[#1e1e35] border-b border-[#2d2d44] flex items-center px-3 md:px-5">
      {/* Left - Logo & Asset */}
      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {/* Hamburger menu for mobile */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="md:hidden p-1.5 hover:bg-[#252542] rounded-lg transition-colors border border-transparent hover:border-[#3d3d5c]"
        >
          <Menu className="h-5 w-5 text-slate-400" />
        </button>

        {/* Logo - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2.5">
          <Image src="/logo.png" alt="OptigoBroker" width={36} height={36} className="h-9 w-9" />
          <span className="text-white font-bold text-lg hidden lg:block">OptigoBroker</span>
        </div>

        <AssetSelector
          selectedAsset={selectedAsset}
          onSelectAsset={onSelectAsset}
          currentPrice={currentPrice?.price}
          currentChange={currentPrice?.changePercent}
          livePrices={livePrices}
        />
      </div>

      {/* Middle - Favorites Bar (horizontally scrollable) */}
      {favoritePairs.length > 0 && (
        <div className="hidden md:flex flex-1 items-center mx-3 min-w-0">
          {/* Scroll Left Button - Only show when needed */}
          {showScrollButtons && (
            <button
              onClick={() => scrollFavorites('left')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-[#252542] rounded-lg transition-colors text-slate-500 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Scrollable Favorites Container */}
          <div
            ref={favoritesScrollRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {favoritePairs.map((pair) => {
              const liveData = livePrices?.get(pair.symbol);
              const change = liveData?.changePercent ?? 0;
              const isSelected = selectedAsset === pair.symbol;

              return (
                <div
                  key={pair.symbol}
                  className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-lg transition-all text-sm group',
                    isSelected
                      ? 'bg-[#1079ff]/20 text-white'
                      : 'bg-[#252542]/60 text-slate-400 hover:text-white hover:bg-[#252542]'
                  )}
                >
                  <button
                    onClick={() => onSelectAsset(pair.symbol)}
                    className="flex items-center gap-2"
                  >
                    <Star className={cn('h-3.5 w-3.5', isSelected ? 'text-yellow-400 fill-yellow-400' : 'text-yellow-500/40')} />
                    <span className="font-medium whitespace-nowrap">{pair.symbol}</span>
                    <span className={cn(
                      'text-xs',
                      change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFavoritePair(pair.symbol);
                    }}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                    title="Remove from favorites"
                  >
                    <X className="h-3 w-3 text-slate-500 hover:text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Scroll Right Button - Only show when needed */}
          {showScrollButtons && (
            <button
              onClick={() => scrollFavorites('right')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center hover:bg-[#252542] rounded-lg transition-colors text-slate-500 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Divider */}
          <div className="w-px h-7 bg-[#2d2d44] ml-2 flex-shrink-0" />
        </div>
      )}

      {/* Right - Price, Balance & User */}
      <div className="flex items-center gap-2.5 flex-shrink-0 ml-auto">
        {/* Current Price Display */}
        {currentPrice && (
          <div className={cn(
            'hidden md:flex items-center gap-2 h-9 px-3 rounded-lg transition-colors',
            currentPrice.changePercent >= 0
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400'
          )}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-white font-bold text-sm">
              {currentPrice.price.toFixed(currentPrice.price > 100 ? 2 : 5)}
            </span>
            <span className="text-xs font-medium">
              {currentPrice.changePercent >= 0 ? '+' : ''}{currentPrice.changePercent.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Account Switcher */}
        <AccountSwitcher compact className="hidden md:block" />
        <AccountSwitcher compact className="md:hidden" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 h-9 rounded-lg transition-all bg-[#252542]/60 hover:bg-[#252542] px-2.5"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-lg flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="hidden lg:block text-sm font-medium text-slate-300 max-w-[100px] truncate">
              {user.name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', showMenu && 'rotate-180')} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-xl z-50 overflow-hidden">
                {/* User Header */}
                <div className="px-4 py-3 border-b border-[#2d2d44]">
                  <p className="text-white text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-slate-500 text-xs truncate">{user.email}</p>
                </div>

                {/* Menu Items */}
                <div className="py-1.5">
                  <button
                    onClick={() => {
                      router.push('/dashboard/profile');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <User className="h-4 w-4 text-[#1079ff]" />
                    <span className="text-sm">Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/dashboard');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm">Dashboard</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/dashboard/history');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <History className="h-4 w-4 text-amber-400" />
                    <span className="text-sm">Trade History</span>
                  </button>

                  <button
                    onClick={() => {
                      router.push('/dashboard/settings');
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">Settings</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        router.push('/admin');
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-[#252542] transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">Admin</span>
                    </button>
                  )}
                </div>

                <div className="border-t border-[#2d2d44]" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
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
        <div className="fixed inset-y-0 left-0 w-72 bg-[#1a1a2e] z-50 md:hidden flex flex-col animate-slide-in">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2d2d44] bg-gradient-to-r from-[#1a1a2e] to-[#1e1e35]">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="OptigoBroker" width={24} height={24} />
              <span className="text-lg font-bold text-white">OptigoBroker</span>
            </div>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-[#252542] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-[#2d2d44]">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-xl flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{user.name}</p>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
              </div>
            </div>

            {/* Balance Display with Account Type */}
            <div className="mt-3">
              <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                isLiveMode
                  ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLiveMode ? 'bg-emerald-500/20' : 'bg-amber-500/20'}`}>
                    <Wallet className={`h-4 w-4 ${isLiveMode ? 'text-emerald-400' : 'text-amber-400'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-medium text-sm">Balance</span>
                    <span className={`text-[10px] font-semibold ${isLiveMode ? 'text-emerald-400' : 'text-amber-400'}`}>
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
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-[#1079ff] to-[#0d5fd3] hover:from-[#2389ff] hover:to-[#1079ff] text-white py-2 rounded-lg transition-all shadow-lg shadow-blue-500/20"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                Deposit
              </Link>
              <Link
                href="/dashboard/withdraw"
                onClick={() => setShowMobileMenu(false)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-[#252542] hover:bg-[#2d2d52] text-white py-2 rounded-lg transition-all border border-[#3d3d5c]"
              >
                <ArrowUpFromLine className="h-3.5 w-3.5" />
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
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-[#252542] hover:text-white transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#252542] flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                );
              })}

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setShowMobileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm">Admin Panel</span>
                </Link>
              )}
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-[#2d2d44]">
            <button
              onClick={() => {
                setShowMobileMenu(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
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
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `}</style>
    </>
  );
}
