'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Crown } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

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
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <Crown className="h-16 w-16 text-amber-500 mx-auto" />
          <h1 className="mt-6 text-2xl font-bold text-white">SuperAdmin Access Required</h1>
          <p className="mt-4 text-slate-400">
            This area is restricted to SuperAdmin accounts only.
            Please contact your system administrator if you need access.
          </p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-6 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Return to Admin Panel
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
