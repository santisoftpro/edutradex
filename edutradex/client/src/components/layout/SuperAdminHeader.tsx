'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Crown,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { UserAvatar, Dropdown, DropdownItem, DropdownHeader, Badge } from '@/components/ui';

export function SuperAdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (!user) return null;

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Crown className="h-6 w-6 md:h-8 md:w-8 text-amber-500" />
        <span className="text-lg md:text-xl font-bold text-white">SuperAdmin</span>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="md:hidden p-2 text-slate-400 hover:text-white"
      >
        {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Desktop Actions */}
      <div className="hidden md:flex items-center gap-4">
        <div className="hidden lg:flex items-center gap-2 bg-amber-900/30 border border-amber-900/50 rounded-lg px-4 py-2">
          <Crown className="h-4 w-4 text-amber-400" />
          <span className="text-amber-400 font-medium text-sm">SuperAdmin</span>
        </div>

        <Dropdown
          contentClassName="w-48"
          trigger={
            <button className="flex items-center gap-2 hover:bg-slate-700 rounded-lg px-3 py-2 transition-colors">
              <UserAvatar variant="superadmin" size="sm" />
              <span className="text-white font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>
          }
        >
          <DropdownHeader>
            <p className="text-sm text-slate-400">Signed in as</p>
            <p className="text-white font-medium truncate">{user.email}</p>
            <p className="text-xs text-amber-400 mt-1">SuperAdmin Account</p>
          </DropdownHeader>
          <DropdownItem href="/admin">
            <Shield className="h-4 w-4" />
            Admin Panel
          </DropdownItem>
          <DropdownItem onClick={handleLogout} variant="danger">
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownItem>
        </Dropdown>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed top-16 right-0 left-0 z-50 bg-slate-800 border-b border-slate-700 md:hidden">
            <div className="p-4 space-y-3">
              {/* User Info */}
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <UserAvatar variant="superadmin" size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <Badge variant="superadmin" size="sm">SuperAdmin</Badge>
                </div>
              </div>

              {/* Quick Links */}
              <Link
                href="/admin"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Shield className="h-5 w-5" />
                <span className="font-medium">Admin Panel</span>
              </Link>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
