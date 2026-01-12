import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { StatsHeader } from "@/components/statistics/stats-header";
import { OverviewStats } from "@/components/statistics/overview-stats";
import { PerformanceCharts } from "@/components/statistics/performance-charts";
import { ConversionFunnel } from "@/components/statistics/conversion-funnel";
import { TopReferrals } from "@/components/statistics/top-referrals";
import { GeographicBreakdown } from "@/components/statistics/geographic-breakdown";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Statistics & Analytics",
  description: "View detailed analytics and performance metrics",
};

async function StatisticsContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const partnerId = session.user.id;

  // Get date ranges
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all statistics data in parallel
  const [
    partner,
    totalClicks,
    clicksLast30Days,
    totalTraders,
    tradersLast30Days,
    totalFTDs,
    ftdsLast30Days,
    totalCommissions,
    commissionsLast30Days,
    dailyClicks,
    dailyRegistrations,
    dailyEarnings,
    topTraders,
    countryBreakdown,
    linkPerformance,
  ] = await Promise.all([
    // Partner data
    db.partner.findUnique({
      where: { id: partnerId },
      select: {
        totalEarned: true,
        totalFTD: true,
        totalTraders: true,
        level: true,
      },
    }),

    // Total clicks
    db.linkClick.count({
      where: {
        link: { partnerId },
      },
    }),

    // Clicks last 30 days
    db.linkClick.count({
      where: {
        link: { partnerId },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Total traders
    db.trader.count({
      where: { partnerId },
    }),

    // Traders last 30 days
    db.trader.count({
      where: {
        partnerId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),

    // Total FTDs
    db.trader.count({
      where: {
        partnerId,
        hasFTD: true,
      },
    }),

    // FTDs last 30 days
    db.trader.count({
      where: {
        partnerId,
        hasFTD: true,
        ftdDate: { gte: thirtyDaysAgo },
      },
    }),

    // Total commissions earned
    db.commission.aggregate({
      where: {
        partnerId,
        status: "CREDITED",
      },
      _sum: { amount: true },
    }),

    // Commissions last 30 days
    db.commission.aggregate({
      where: {
        partnerId,
        status: "CREDITED",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    }),

    // Daily clicks for last 30 days
    db.linkClick.groupBy({
      by: ["createdAt"],
      where: {
        link: { partnerId },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
      orderBy: { createdAt: "asc" },
    }),

    // Daily registrations for last 30 days
    db.trader.groupBy({
      by: ["createdAt"],
      where: {
        partnerId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
      orderBy: { createdAt: "asc" },
    }),

    // Daily earnings for last 30 days
    db.commission.groupBy({
      by: ["createdAt"],
      where: {
        partnerId,
        status: "CREDITED",
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      orderBy: { createdAt: "asc" },
    }),

    // Top performing traders
    db.trader.findMany({
      where: {
        partnerId,
        hasFTD: true,
      },
      select: {
        id: true,
        tradingUid: true,
        country: true,
        totalDeposits: true,
        turnover: true,
        registeredAt: true,
        ftdDate: true,
        ftdAmount: true,
        commissions: {
          where: { status: "CREDITED" },
          select: { amount: true },
        },
      },
      orderBy: { totalDeposits: "desc" },
      take: 10,
    }),

    // Country breakdown
    db.trader.groupBy({
      by: ["country"],
      where: {
        partnerId,
        country: { not: null },
      },
      _count: true,
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),

    // Link performance
    db.trackingLink.findMany({
      where: { partnerId },
      select: {
        id: true,
        code: true,
        comment: true,
        clickCount: true,
        _count: {
          select: {
            traders: true,
          },
        },
        traders: {
          where: { hasFTD: true },
          select: { id: true },
        },
      },
      orderBy: { clickCount: "desc" },
      take: 5,
    }),
  ]);

  if (!partner) {
    redirect("/login");
  }

  // Process daily data for charts
  const processedDailyData = processDailyData(
    dailyClicks,
    dailyRegistrations,
    dailyEarnings,
    thirtyDaysAgo
  );

  // Calculate conversion rates
  const clickToRegRate = totalClicks > 0 ? (totalTraders / totalClicks) * 100 : 0;
  const regToFtdRate = totalTraders > 0 ? (totalFTDs / totalTraders) * 100 : 0;
  const overallConvRate = totalClicks > 0 ? (totalFTDs / totalClicks) * 100 : 0;

  // Process top traders
  const processedTopTraders = topTraders.map((trader) => ({
    id: trader.id,
    tradingUid: trader.tradingUid,
    country: trader.country,
    totalDeposits: Number(trader.totalDeposits),
    turnover: Number(trader.turnover),
    registeredAt: trader.registeredAt,
    ftdDate: trader.ftdDate,
    ftdAmount: trader.ftdAmount ? Number(trader.ftdAmount) : null,
    totalCommission: trader.commissions.reduce(
      (sum, c) => sum + Number(c.amount),
      0
    ),
  }));

  // Process link performance
  const processedLinks = linkPerformance.map((link) => ({
    id: link.id,
    code: link.code,
    comment: link.comment,
    clicks: link.clickCount,
    registrations: link._count.traders,
    ftds: link.traders.length,
    conversionRate:
      link.clickCount > 0
        ? ((link.traders.length / link.clickCount) * 100).toFixed(1)
        : "0",
  }));

  return (
    <div className="space-y-6">
      <StatsHeader />

      <OverviewStats
        totalClicks={totalClicks}
        clicksLast30Days={clicksLast30Days}
        totalRegistrations={totalTraders}
        registrationsLast30Days={tradersLast30Days}
        totalFTDs={totalFTDs}
        ftdsLast30Days={ftdsLast30Days}
        totalEarnings={Number(partner.totalEarned)}
        earningsLast30Days={Number(commissionsLast30Days._sum.amount || 0)}
        clickToRegRate={clickToRegRate}
        regToFtdRate={regToFtdRate}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceCharts data={processedDailyData} />
        </div>
        <div>
          <ConversionFunnel
            clicks={totalClicks}
            registrations={totalTraders}
            ftds={totalFTDs}
            clickToRegRate={clickToRegRate}
            regToFtdRate={regToFtdRate}
            overallRate={overallConvRate}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopReferrals traders={processedTopTraders} links={processedLinks} />
        <GeographicBreakdown data={countryBreakdown} totalTraders={totalTraders} />
      </div>
    </div>
  );
}

function processDailyData(
  clicks: { createdAt: Date; _count: number }[],
  registrations: { createdAt: Date; _count: number }[],
  earnings: { createdAt: Date; _sum: { amount: unknown } }[],
  startDate: Date
) {
  const data: {
    date: string;
    clicks: number;
    registrations: number;
    earnings: number;
  }[] = [];

  // Create a map for each metric by date
  const clicksMap = new Map<string, number>();
  const regsMap = new Map<string, number>();
  const earningsMap = new Map<string, number>();

  clicks.forEach((c) => {
    const dateKey = c.createdAt.toISOString().split("T")[0];
    clicksMap.set(dateKey, (clicksMap.get(dateKey) || 0) + c._count);
  });

  registrations.forEach((r) => {
    const dateKey = r.createdAt.toISOString().split("T")[0];
    regsMap.set(dateKey, (regsMap.get(dateKey) || 0) + r._count);
  });

  earnings.forEach((e) => {
    const dateKey = e.createdAt.toISOString().split("T")[0];
    earningsMap.set(
      dateKey,
      (earningsMap.get(dateKey) || 0) + Number(e._sum.amount || 0)
    );
  });

  // Generate all dates in range
  const current = new Date(startDate);
  const now = new Date();

  while (current <= now) {
    const dateKey = current.toISOString().split("T")[0];
    data.push({
      date: dateKey,
      clicks: clicksMap.get(dateKey) || 0,
      registrations: regsMap.get(dateKey) || 0,
      earnings: earningsMap.get(dateKey) || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return data;
}

export default function StatisticsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading statistics..." />}>
      <StatisticsContent />
    </Suspense>
  );
}
