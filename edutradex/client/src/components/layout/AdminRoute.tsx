'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader, AccessDenied } from '@/components/ui';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) {
    return <PageLoader message="Loading admin panel..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') {
    return (
      <AccessDenied
        variant="admin"
        icon={ShieldAlert}
        title="Access Denied"
        description="You do not have permission to access the admin panel. This area is restricted to administrators only."
        returnPath="/dashboard"
        returnLabel="Return to Dashboard"
      />
    );
  }

  return <>{children}</>;
}
