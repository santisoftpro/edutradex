'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DepositNotificationProvider } from '@/components/notifications/DepositNotification';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';
import { useImpersonationStore } from '@/store/impersonation.store';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

function ImpersonationSetup() {
  const searchParams = useSearchParams();
  const { startImpersonation, isImpersonating } = useImpersonationStore();
  const { setUser: setAuthUser, setToken: setAuthToken } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const isImpersonateMode = searchParams.get('impersonate') === 'true';

    if (isImpersonateMode && !isImpersonating) {
      // Use sessionStorage for impersonation data (more secure)
      const token = sessionStorage.getItem('impersonation-token');
      const userStr = sessionStorage.getItem('impersonation-user');
      const adminId = sessionStorage.getItem('impersonation-admin-id');

      if (token && userStr && adminId) {
        try {
          const user = JSON.parse(userStr);

          // Set up impersonation (using sessionStorage for security)
          startImpersonation({
            originalAdminId: adminId,
            impersonatedUserId: user.id,
            impersonatedUserEmail: user.email,
            impersonatedUserName: user.name,
            newToken: token,
          });

          // Set auth state
          setAuthUser(user);
          setAuthToken(token);
          localStorage.setItem('auth-token', token);
          api.setToken(token);

          // Clean up temporary storage (now using sessionStorage)
          sessionStorage.removeItem('impersonation-token');
          sessionStorage.removeItem('impersonation-user');
          sessionStorage.removeItem('impersonation-admin-id');
        } catch (e) {
          console.error('Failed to setup impersonation:', e);
        }
      }
    }

    setInitialized(true);
  }, [searchParams, isImpersonating, startImpersonation, setAuthUser, setAuthToken, initialized]);

  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DepositNotificationProvider>
        <ImpersonationSetup />
        <ImpersonationBanner />
        <div className="min-h-screen bg-slate-900 flex flex-col">
          <Header />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
          </div>
          <MobileNav />
        </div>
      </DepositNotificationProvider>
    </ProtectedRoute>
  );
}
