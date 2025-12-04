'use client';

import { AdminHeader } from '@/components/layout/AdminHeader';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminMobileNav } from '@/components/layout/AdminMobileNav';
import { AdminRoute } from '@/components/layout/AdminRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <AdminHeader />
        <div className="flex-1 flex overflow-hidden">
          <AdminSidebar />
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </div>
        <AdminMobileNav />
      </div>
    </AdminRoute>
  );
}
