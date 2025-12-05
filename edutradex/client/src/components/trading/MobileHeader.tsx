'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Wallet } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency } from '@/lib/utils';

export function MobileHeader() {
  const { user } = useAuthStore();
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);

  if (!user) return null;

  return (
    <header className="md:hidden h-16 bg-[#0d0d1a] flex items-center justify-between px-4">
      {/* Logo - Circular with gold ring */}
      <div className="w-12 h-12 rounded-full border-[3px] border-amber-500 flex items-center justify-center bg-gradient-to-br from-teal-600 to-teal-800 shadow-lg">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
          <span className="text-white font-bold text-xs">OB</span>
        </div>
      </div>

      {/* Balance - Center */}
      <div className="relative">
        <button
          onClick={() => setShowBalanceMenu(!showBalanceMenu)}
          className="flex items-center gap-1 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-3 py-1.5"
        >
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-[10px]">Demo</span>
              <span className="text-gray-500 text-[10px]">USD</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white font-bold text-lg">
                {user.demoBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </button>

        {showBalanceMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowBalanceMenu(false)} />
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-52 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-4 py-3 bg-[#252542]">
                <p className="text-gray-400 text-xs">Available Balance</p>
                <p className="text-xl text-white font-bold">{formatCurrency(user.demoBalance)}</p>
              </div>
              <Link
                href="/dashboard/deposit"
                onClick={() => setShowBalanceMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#252542] transition-colors"
              >
                <Wallet className="h-4 w-4 text-emerald-500" />
                <span>Deposit</span>
              </Link>
              <Link
                href="/dashboard/withdraw"
                onClick={() => setShowBalanceMenu(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-[#252542] transition-colors"
              >
                <Wallet className="h-4 w-4 text-orange-500" />
                <span>Withdraw</span>
              </Link>
            </div>
          </>
        )}
      </div>

      {/* Deposit Button - Green square */}
      <Link
        href="/dashboard/deposit"
        className="w-12 h-12 bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center transition-colors shadow-lg"
      >
        <Wallet className="h-6 w-6 text-white" />
      </Link>
    </header>
  );
}
