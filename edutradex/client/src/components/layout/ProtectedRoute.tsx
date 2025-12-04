'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, isHydrated, syncBalanceFromServer } = useAuthStore();
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  // Sync balance from server when user is authenticated
  // This ensures balance is always fresh from database
  useEffect(() => {
    if (isHydrated && isAuthenticated && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncBalanceFromServer();
    }
  }, [isHydrated, isAuthenticated, syncBalanceFromServer]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
