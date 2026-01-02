'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Wallet, RefreshCw, Check, ExternalLink } from 'lucide-react';
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
      {/* Balance Dropdown Trigger - shows current account type and balance */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-all',
          compact
            ? 'px-3 py-1.5 bg-slate-800 hover:bg-slate-700'
            : 'px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700',
          isSwitching && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Wallet className={cn(
          compact ? 'w-4 h-4' : 'w-5 h-5',
          isLiveMode ? 'text-emerald-400' : 'text-amber-400'
        )} />
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold text-white', compact ? 'text-sm' : 'text-base')}>
            {formatCurrency(activeBalance)}
          </span>
          <span className={cn(
            'px-1.5 py-0.5 text-[10px] font-bold rounded',
            isLiveMode
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/20 text-amber-400'
          )}>
            {isLiveMode ? 'LIVE' : 'DEMO'}
          </span>
        </div>
        <ChevronDown className={cn(
          'w-4 h-4 text-slate-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* On Live Trade Page - Only show Live Account info */}
          {pathname === '/dashboard/trade' ? (
            <>
              <div className="px-4 py-3 bg-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">Live Account</span>
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400">
                        REAL
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatCurrency(user.demoBalance)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-700" />
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/demo-trade');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20">
                  <ExternalLink className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <span className="font-medium text-white">Go to Demo Trading</span>
                  <p className="text-xs text-slate-400">Practice with virtual money</p>
                </div>
              </button>
            </>
          ) : pathname === '/dashboard/demo-trade' ? (
            /* On Demo Trade Page - Only show Demo Account info */
            <>
              <div className="px-4 py-3 bg-slate-700/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">Demo Account</span>
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-400">
                        PRACTICE
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatCurrency(user.practiceBalance)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-700" />
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard/trade');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
                  <ExternalLink className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="font-medium text-white">Go to Live Trading</span>
                  <p className="text-xs text-slate-400">Trade with real money</p>
                </div>
              </button>
              <div className="border-t border-slate-700" />
              <button
                onClick={handleResetPractice}
                disabled={isResetting}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20">
                  <RefreshCw className={cn('w-5 h-5 text-blue-400', isResetting && 'animate-spin')} />
                </div>
                <div>
                  <span className="font-medium text-white">Reset Practice Balance</span>
                  <p className="text-xs text-slate-400">Get $10,000 virtual money</p>
                </div>
              </button>
            </>
          ) : (
            /* On Other Pages - Show both account options */
            <>
              {/* Live Account Option */}
              <button
                onClick={() => handleSwitch('LIVE')}
                disabled={isSwitching}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors',
                  isLiveMode && 'bg-slate-700/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/20">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">Live Account</span>
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-emerald-500/20 text-emerald-400">
                        REAL
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatCurrency(user.demoBalance)}
                    </span>
                  </div>
                </div>
                {isLiveMode && <Check className="w-5 h-5 text-emerald-400" />}
              </button>

              <div className="border-t border-slate-700" />

              {/* Demo Account Option */}
              <button
                onClick={() => handleSwitch('DEMO')}
                disabled={isSwitching}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors',
                  !isLiveMode && 'bg-slate-700/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/20">
                    <Wallet className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">Demo Account</span>
                      <span className="px-1.5 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-400">
                        PRACTICE
                      </span>
                    </div>
                    <span className="text-sm text-slate-400">
                      {formatCurrency(user.practiceBalance)}
                    </span>
                  </div>
                </div>
                {!isLiveMode ? (
                  <Check className="w-5 h-5 text-amber-400" />
                ) : (
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Reset Practice Balance */}
              {(!isLiveMode || user.practiceBalance < 1000) && (
                <>
                  <div className="border-t border-slate-700" />
                  <button
                    onClick={handleResetPractice}
                    disabled={isResetting}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20">
                      <RefreshCw className={cn('w-5 h-5 text-blue-400', isResetting && 'animate-spin')} />
                    </div>
                    <div>
                      <span className="font-medium text-white">Reset Practice Balance</span>
                      <p className="text-xs text-slate-400">Get $10,000 virtual money</p>
                    </div>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
