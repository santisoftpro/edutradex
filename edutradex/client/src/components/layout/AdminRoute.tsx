'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

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

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="mt-6 text-2xl font-bold text-white">Access Denied</h1>
          <p className="mt-4 text-slate-400">
            You do not have permission to access the admin panel.
            This area is restricted to administrators only.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-6 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
