'use client';

import { SuperAdminHeader } from '@/components/layout/SuperAdminHeader';
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar';
import { SuperAdminMobileNav } from '@/components/layout/SuperAdminMobileNav';
import { SuperAdminRoute } from '@/components/layout/SuperAdminRoute';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuperAdminRoute>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <SuperAdminHeader />
        <div className="flex-1 flex overflow-hidden">
          <SuperAdminSidebar />
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </div>
        <SuperAdminMobileNav />
      </div>
    </SuperAdminRoute>
  );
}
