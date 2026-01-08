'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, Wallet, RefreshCw, Check, ExternalLink, Plus, ArrowUpFromLine, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { AccountType } from '@/types';

interface AccountSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function AccountSwitcher({ className, compact = false }: AccountSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  const user = useAuthStore((state) => state.user);
  const switchAccount = useAuthStore((state) => state.switchAccount);
  const topUpPracticeBalance = useAuthStore((state) => state.topUpPracticeBalance);
  const getActiveBalance = useAuthStore((state) => state.getActiveBalance);

  // Check if we're on a trade page
  const isOnTradePage = pathname === '/dashboard/trade' || pathname === '/dashboard/demo-trade';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const activeBalance = getActiveBalance();
  const isLiveMode = user.activeAccountType === 'LIVE';

  const handleSwitch = async (accountType: AccountType) => {
    setIsOpen(false);

    // Navigate to the appropriate trade page
    if (accountType === 'DEMO') {
      router.push('/dashboard/demo-trade');
    } else {
      // If switching to LIVE and currently on demo trade page, go to live trade page
      if (pathname === '/dashboard/demo-trade') {
        router.push('/dashboard/trade');
      } else if (accountType !== user.activeAccountType) {
        // Otherwise just switch the account type
        setIsSwitching(true);
        try {
          await switchAccount(accountType);
          toast.success(`Switched to ${accountType === 'LIVE' ? 'Live' : 'Demo'} account`);
        } catch {
          toast.error('Failed to switch account');
        } finally {
          setIsSwitching(false);
        }
      }
    }
  };

  const handleResetPractice = async () => {
    setIsResetting(true);
    try {
      await topUpPracticeBalance();
      toast.success('Practice balance reset to $10,000');
    } catch {
      toast.error('Failed to reset practice balance');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Balance Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg transition-all',
          isLiveMode
            ? 'bg-[#1079ff]/15 hover:bg-[#1079ff]/25'
            : 'bg-amber-500/15 hover:bg-amber-500/25',
          isSwitching && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Wallet className={cn(
          'w-4 h-4',
          isLiveMode ? 'text-[#1079ff]' : 'text-amber-400'
        )} />
        <span className={cn('font-bold text-white', compact ? 'text-sm' : 'text-base')}>
          {formatCurrency(activeBalance)}
        </span>
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded',
          isLiveMode ? 'bg-[#1079ff]/30 text-[#1079ff]' : 'bg-amber-500/30 text-amber-400'
        )}>
          {isLiveMode ? 'LIVE' : 'DEMO'}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-slate-500 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* On Live Trade Page */}
          {pathname === '/dashboard/trade' ? (
            <>
              {/* Account Info */}
              <div className="px-4 py-3 border-b border-[#2d2d44]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-400">Live Account</span>
                  <span className="text-xs font-bold text-[#1079ff] bg-[#1079ff]/20 px-2 py-0.5 rounded-md">LIVE</span>
                </div>
                <span className="text-lg font-bold text-white">{formatCurrency(user.demoBalance)}</span>
              </div>

              {/* Quick Actions */}
              <div className="p-3 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/deposit"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-[#1079ff] hover:bg-[#1079ff]/80 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Deposit
                </Link>
                <Link
                  href="/dashboard/withdraw"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-[#252542] hover:bg-[#2d2d52] text-white text-sm font-medium rounded-lg transition-all"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  Withdraw
                </Link>
              </div>

              <div className="border-t border-[#2d2d44]" />

              {/* Switch to Demo */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/demo-trade');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#252542] transition-colors text-left"
              >
                <ExternalLink className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-300">Switch to Demo</span>
              </button>
            </>
          ) : pathname === '/dashboard/demo-trade' ? (
            <>
              {/* Account Info */}
              <div className="px-4 py-3 border-b border-[#2d2d44]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-400">Demo Account</span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-md">DEMO</span>
                </div>
                <span className="text-lg font-bold text-white">{formatCurrency(user.practiceBalance)}</span>
              </div>

              {/* Reset Balance */}
              <div className="p-3">
                <button
                  onClick={handleResetPractice}
                  disabled={isResetting}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#252542] hover:bg-[#2d2d52] text-white text-sm font-medium rounded-lg transition-all"
                >
                  <RefreshCw className={cn('w-4 h-4', isResetting && 'animate-spin')} />
                  Reset to $10,000
                </button>
              </div>

              <div className="border-t border-[#2d2d44]" />

              {/* Switch to Live */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/trade');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#252542] transition-colors text-left"
              >
                <TrendingUp className="w-4 h-4 text-[#1079ff]" />
                <span className="text-sm text-slate-300">Switch to Live</span>
              </button>
            </>
          ) : (
            <>
              {/* Live Account Option */}
              <button
                onClick={() => handleSwitch('LIVE')}
                disabled={isSwitching}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-[#252542] transition-colors',
                  isLiveMode && 'bg-[#1079ff]/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-[#1079ff]" />
                  <div className="text-left">
                    <span className="text-sm text-white font-medium">Live</span>
                    <span className="text-sm font-bold text-[#1079ff] ml-2">{formatCurrency(user.demoBalance)}</span>
                  </div>
                </div>
                {isLiveMode && <Check className="w-4 h-4 text-[#1079ff]" />}
              </button>

              <div className="border-t border-[#2d2d44]" />

              {/* Demo Account Option */}
              <button
                onClick={() => handleSwitch('DEMO')}
                disabled={isSwitching}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-[#252542] transition-colors',
                  !isLiveMode && 'bg-amber-500/10'
                )}
              >
                <div className="flex items-center gap-3">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <span className="text-sm text-white font-medium">Demo</span>
                    <span className="text-sm font-bold text-amber-400 ml-2">{formatCurrency(user.practiceBalance)}</span>
                  </div>
                </div>
                {!isLiveMode && <Check className="w-4 h-4 text-amber-400" />}
              </button>

              <div className="border-t border-[#2d2d44]" />

              {/* Quick Actions */}
              <div className="p-3 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/deposit"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-[#1079ff] hover:bg-[#1079ff]/80 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Deposit
                </Link>
                <Link
                  href="/dashboard/withdraw"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-[#252542] hover:bg-[#2d2d52] text-white text-sm font-medium rounded-lg transition-all"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  Withdraw
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
