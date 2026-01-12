"use client";

import {
  MousePointer,
  Users,
  UserCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface OverviewStatsProps {
  totalClicks: number;
  clicksLast30Days: number;
  totalRegistrations: number;
  registrationsLast30Days: number;
  totalFTDs: number;
  ftdsLast30Days: number;
  totalEarnings: number;
  earningsLast30Days: number;
  clickToRegRate: number;
  regToFtdRate: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function OverviewStats({
  totalClicks,
  clicksLast30Days,
  totalRegistrations,
  registrationsLast30Days,
  totalFTDs,
  ftdsLast30Days,
  totalEarnings,
  earningsLast30Days,
  clickToRegRate,
  regToFtdRate,
}: OverviewStatsProps) {
  const stats = [
    {
      label: "Total Clicks",
      value: formatNumber(totalClicks),
      change: clicksLast30Days,
      changeLabel: "Last 30 days",
      icon: MousePointer,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Registrations",
      value: formatNumber(totalRegistrations),
      change: registrationsLast30Days,
      changeLabel: "Last 30 days",
      icon: Users,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      rate: clickToRegRate,
      rateLabel: "Click to Reg",
    },
    {
      label: "FTDs",
      value: formatNumber(totalFTDs),
      change: ftdsLast30Days,
      changeLabel: "Last 30 days",
      icon: UserCheck,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      rate: regToFtdRate,
      rateLabel: "Reg to FTD",
    },
    {
      label: "Total Earnings",
      value: formatCurrency(totalEarnings),
      change: earningsLast30Days,
      changeLabel: "Last 30 days",
      icon: DollarSign,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      isCurrency: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const isPositive = stat.change > 0;

        return (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
                {stat.rate !== undefined && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{stat.rateLabel}</p>
                    <p className="text-sm font-medium">{stat.rate.toFixed(1)}%</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold mb-2">{stat.value}</p>

              <div className="flex items-center gap-1 text-sm">
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={isPositive ? "text-green-400" : "text-muted-foreground"}>
                  {stat.isCurrency
                    ? formatCurrency(stat.change)
                    : `+${formatNumber(stat.change)}`}
                </span>
                <span className="text-muted-foreground">{stat.changeLabel}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
