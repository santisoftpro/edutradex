'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  TrendingUp,
  User,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

export function AccountDropdown() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const balance = user.demoBalance ?? 0;

  const handleLogout = () => {
    logout();
    router.push('/login');
    setIsOpen(false);
  };

  const menuItems = [
    { label: 'Deposit', icon: ArrowDownToLine, href: '/dashboard/deposit' },
    { label: 'Withdrawal', icon: ArrowUpFromLine, href: '/dashboard/withdraw' },
    { label: 'Transactions', icon: History, href: '/dashboard/transactions' },
    { label: 'Trades', icon: TrendingUp, href: '/dashboard/history' },
    { label: 'Account', icon: User, href: '/dashboard/settings' },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Wallet className="h-4 w-4 text-emerald-500" />
        <div className="text-left">
          <div className="text-[10px] text-slate-400 uppercase">Balance</div>
          <div className="text-sm font-semibold text-emerald-500">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* User Info */}
          <div className="p-4 border-b border-slate-700">
            <p className="text-white font-medium truncate">{user.email}</p>
            <p className="text-xs text-slate-500">ID: {user.id.slice(0, 8)}</p>
          </div>

          {/* Balance Display */}
          <div className="p-3 border-b border-slate-700">
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-500" />
                <span className="text-white font-medium">Balance</span>
              </div>
              <div className="text-emerald-500 font-bold">
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2 border-b border-slate-700">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  router.push(item.href);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
