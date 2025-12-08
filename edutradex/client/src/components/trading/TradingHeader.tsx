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
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { AssetSelector } from './AssetSelector';
import { PriceTick } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

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

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

  if (!user) return null;

  const priceColor = currentPrice?.changePercent !== undefined && currentPrice.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400';
  const TrendIcon = currentPrice?.changePercent !== undefined && currentPrice.changePercent >= 0 ? TrendingUp : TrendingDown;

  return (
    <header className="h-12 md:h-14 bg-[#1a1a2e] border-b border-[#2d2d44] flex items-center justify-between px-2 md:px-4">
      {/* Left - Logo & Asset */}
      <div className="flex items-center gap-2 md:gap-6">
        {/* Back button for mobile */}
        <button
          onClick={() => router.push('/dashboard')}
          className="md:hidden p-1.5 hover:bg-[#252542] rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
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
  );
}
