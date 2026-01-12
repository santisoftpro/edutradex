"use client";

import {
  Users,
  UserCheck,
  DollarSign,
  Wallet,
  TrendingUp,
  Percent,
} from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getLevelRate } from "@/lib/constants";

interface KPIData {
  registrations: number;
  ftdCount: number;
  totalDeposits: number | { toNumber(): number };
  commissionsEarned: number | { toNumber(): number };
  availableBalance: number | { toNumber(): number };
  pendingBalance: number | { toNumber(): number };
  totalEarned: number | { toNumber(): number };
  conversionRate: string;
}

interface DashboardKPIsProps {
  data: KPIData;
  level: PartnerLevel;
}

function toNumber(value: number | { toNumber(): number }): number {
  if (typeof value === "number") return value;
  return value.toNumber();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

const kpiConfig = [
  {
    key: "registrations",
    label: "Registrations",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    getValue: (data: KPIData) => formatNumber(data.registrations),
  },
  {
    key: "ftdCount",
    label: "FTD Count",
    icon: UserCheck,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    getValue: (data: KPIData) => formatNumber(data.ftdCount),
  },
  {
    key: "totalDeposits",
    label: "Total Deposits",
    icon: DollarSign,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    getValue: (data: KPIData) => formatCurrency(toNumber(data.totalDeposits)),
  },
  {
    key: "commissionsEarned",
    label: "Commissions Earned",
    icon: TrendingUp,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    getValue: (data: KPIData) => formatCurrency(toNumber(data.commissionsEarned)),
  },
  {
    key: "availableBalance",
    label: "Available Balance",
    icon: Wallet,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    getValue: (data: KPIData) => formatCurrency(toNumber(data.availableBalance)),
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    icon: Percent,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    getValue: (data: KPIData) => `${data.conversionRate}%`,
  },
];

export function DashboardKPIs({ data, level }: DashboardKPIsProps) {
  const currentRate = getLevelRate(level);

  return (
    <div className="space-y-4">
      {/* Current level indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Current Level:</span>
        <span className="font-medium text-primary">{level}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">Revenue Share:</span>
        <span className="font-medium text-green-400">{(currentRate * 100).toFixed(0)}%</span>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiConfig.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.key} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="mt-1 text-xl font-bold">{kpi.getValue(data)}</p>
                  </div>
                  <div className={cn("rounded-lg p-2", kpi.bgColor)}>
                    <Icon className={cn("h-4 w-4", kpi.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
