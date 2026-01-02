'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
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
      const token = sessionStorage.getItem('impersonation-token');
      const userStr = sessionStorage.getItem('impersonation-user');
      const adminId = sessionStorage.getItem('impersonation-admin-id');

      if (token && userStr && adminId) {
        try {
          const user = JSON.parse(userStr);

          startImpersonation({
            originalAdminId: adminId,
            impersonatedUserId: user.id,
            impersonatedUserEmail: user.email,
            impersonatedUserName: user.name,
            newToken: token,
          });

          setAuthUser(user);
          setAuthToken(token);
          localStorage.setItem('auth-token', token);
          api.setToken(token);

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
  const pathname = usePathname();

  // Trade pages have their own layout with TradingHeader - don't show the default layout
  const isTradePagePath = pathname === '/dashboard/trade' || pathname === '/dashboard/demo-trade';

  // For trade pages, render just the children (they have their own fixed layout)
  if (isTradePagePath) {
    return (
      <ProtectedRoute>
        <DepositNotificationProvider>
          <ImpersonationSetup />
          <ImpersonationBanner />
          {children}
        </DepositNotificationProvider>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DepositNotificationProvider>
        <ImpersonationSetup />
        <ImpersonationBanner />
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex flex-col">
          <Header />
          <div className="flex-1 flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="p-4 md:p-6 pb-20 md:pb-6">
                {children}
              </div>
            </main>
          </div>
          <MobileNav />
        </div>
      </DepositNotificationProvider>
    </ProtectedRoute>
  );
}
