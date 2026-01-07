'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crown } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { PageLoader, AccessDenied } from '@/components/ui';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'SUPERADMIN') {
    return (
      <AccessDenied
        variant="superadmin"
        icon={Crown}
        title="SuperAdmin Access Required"
        description="This area is restricted to SuperAdmin accounts only. Please contact your system administrator if you need access."
        returnPath="/admin"
        returnLabel="Return to Admin Panel"
      />
    );
  }

  return <>{children}</>;
}
