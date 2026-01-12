import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StatisticsService } from "@/services/statistics.service";
import { DashboardKPIs } from "@/components/dashboard/kpis";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your affiliate performance and statistics",
};

async function DashboardContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [kpiData, performanceData] = await Promise.all([
    StatisticsService.getKPISummary(session.user.id),
    StatisticsService.getPerformanceData(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your affiliate performance
        </p>
      </div>

      {/* KPI Cards */}
      <DashboardKPIs data={kpiData} level={session.user.level} />

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance chart - takes 2 columns */}
        <div className="lg:col-span-2">
          <PerformanceChart data={performanceData} />
        </div>

        {/* Quick actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Recent activity */}
      <RecentActivity partnerId={session.user.id} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
