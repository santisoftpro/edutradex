'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { DepositNotificationProvider } from '@/components/notifications/DepositNotification';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DepositNotificationProvider>
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
