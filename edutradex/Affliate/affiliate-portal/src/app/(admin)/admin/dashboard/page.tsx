import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Users,
  Wallet,
  MessageSquare,
  TrendingUp,
  DollarSign,
  UserCheck,
} from "lucide-react";

import { AdminDashboardService } from "@/services/admin/dashboard.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Admin overview and statistics",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

async function DashboardContent() {
  const data = await AdminDashboardService.getOverviewStats();

  const stats = [
    {
      title: "Total Partners",
      value: data.stats.totalPartners,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Active Partners",
      value: data.stats.activePartners,
      icon: UserCheck,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending Withdrawals",
      value: data.stats.pendingWithdrawals,
      icon: Wallet,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Open Tickets",
      value: data.stats.openTickets,
      icon: MessageSquare,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Level Reviews",
      value: data.stats.pendingLevelReviews,
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total Paid Out",
      value: formatCurrency(data.stats.totalCommissionsPaid),
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the affiliate program
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Partners */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Partners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentPartners.length === 0 ? (
                <p className="text-muted-foreground text-sm">No partners yet</p>
              ) : (
                data.recentPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {partner.firstName} {partner.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {partner.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {partner.level}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(partner.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Withdrawals */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Pending Withdrawals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentWithdrawals.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No pending withdrawals
                </p>
              ) : (
                data.recentWithdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium">{withdrawal.partner.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {withdrawal.method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-500">
                        {formatCurrency(withdrawal.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  );
}
