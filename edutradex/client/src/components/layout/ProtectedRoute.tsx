'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader } from '@/components/ui';

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

  useEffect(() => {
    if (isHydrated && isAuthenticated && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncBalanceFromServer();
    }
  }, [isHydrated, isAuthenticated, syncBalanceFromServer]);

  if (!isHydrated) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
