"use client";

import {
  Award,
  Users,
  DollarSign,
  Calendar,
  CheckCircle,
} from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLevelConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CurrentLevelCardProps {
  level: PartnerLevel;
  totalFTD: number;
  totalEarned: number;
}

const levelGradients: Record<PartnerLevel, string> = {
  STARTER: "from-blue-500/20 to-blue-600/5",
  BUILDER: "from-indigo-500/20 to-indigo-600/5",
  GROWTH: "from-violet-500/20 to-violet-600/5",
  ADVANCED: "from-purple-500/20 to-purple-600/5",
  PRO: "from-fuchsia-500/20 to-fuchsia-600/5",
  AMBASSADOR: "from-amber-500/20 to-amber-600/5",
};

const levelIcons: Record<PartnerLevel, string> = {
  STARTER: "text-blue-400",
  BUILDER: "text-indigo-400",
  GROWTH: "text-violet-400",
  ADVANCED: "text-purple-400",
  PRO: "text-fuchsia-400",
  AMBASSADOR: "text-amber-400",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CurrentLevelCard({
  level,
  totalFTD,
  totalEarned,
}: CurrentLevelCardProps) {
  const config = getLevelConfig(level);

  const benefits = [
    {
      icon: DollarSign,
      label: "Revenue Share",
      value: `${(config.rate * 100).toFixed(0)}%`,
    },
    {
      icon: Calendar,
      label: "Withdrawal Frequency",
      value:
        config.withdrawalFrequency === "daily"
          ? "Daily"
          : config.withdrawalFrequency === "twice_per_week"
          ? "Twice per week"
          : "Weekly",
    },
  ];

  return (
    <Card className={cn("glass-card overflow-hidden")}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50",
          levelGradients[level]
        )}
      />
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                "bg-gradient-to-br from-white/10 to-white/5"
              )}
            >
              <Award className={cn("h-6 w-6", levelIcons[level])} />
            </div>
            <div>
              <CardTitle className="text-xl">{config.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="bg-green-500/20 text-green-400 border-green-500/30"
          >
            Active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />
              Total FTDs
            </div>
            <p className="text-2xl font-bold">{totalFTD}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Total Earned
            </div>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(totalEarned)}
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Your Benefits
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={benefit.label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {benefit.label}
                    </p>
                    <p className="font-medium">{benefit.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Social Requirement */}
        {config.socialRequired && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span>{config.socialRequirement}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
