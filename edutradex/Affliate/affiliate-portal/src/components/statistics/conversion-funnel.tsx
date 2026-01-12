"use client";

import { ArrowDown, MousePointer, Users, UserCheck, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ConversionFunnelProps {
  clicks: number;
  registrations: number;
  ftds: number;
  clickToRegRate: number;
  regToFtdRate: number;
  overallRate: number;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function ConversionFunnel({
  clicks,
  registrations,
  ftds,
  clickToRegRate,
  regToFtdRate,
  overallRate,
}: ConversionFunnelProps) {
  const stages = [
    {
      label: "Clicks",
      value: clicks,
      icon: MousePointer,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      barColor: "bg-blue-500",
      width: "100%",
    },
    {
      label: "Registrations",
      value: registrations,
      icon: Users,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/20",
      barColor: "bg-indigo-500",
      width: clicks > 0 ? `${Math.max(20, (registrations / clicks) * 100)}%` : "20%",
      rate: clickToRegRate,
      rateLabel: "of clicks",
    },
    {
      label: "FTDs",
      value: ftds,
      icon: UserCheck,
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      barColor: "bg-green-500",
      width: clicks > 0 ? `${Math.max(15, (ftds / clicks) * 100)}%` : "15%",
      rate: regToFtdRate,
      rateLabel: "of registrations",
    },
  ];

  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Conversion Funnel
        </CardTitle>
        <p className="text-sm text-muted-foreground">Your conversion pipeline</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.label}>
              {/* Stage */}
              <div className="relative">
                <div
                  className={cn(
                    "p-4 rounded-xl border transition-all",
                    stage.bgColor,
                    "border-border"
                  )}
                  style={{ width: stage.width }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg bg-background/50")}>
                      <Icon className={cn("h-5 w-5", stage.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground">{stage.label}</p>
                      <p className="text-xl font-bold">{formatNumber(stage.value)}</p>
                    </div>
                    {stage.rate !== undefined && (
                      <div className="text-right">
                        <p className={cn("text-lg font-bold", stage.color)}>
                          {stage.rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">{stage.rateLabel}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrow between stages */}
              {!isLast && (
                <div className="flex justify-center py-2">
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}

        {/* Overall conversion rate */}
        <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
              <p className="text-xs text-muted-foreground">Clicks to FTDs</p>
            </div>
            <p className="text-2xl font-bold text-primary">{overallRate.toFixed(2)}%</p>
          </div>
        </div>

        {/* Tips */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {clickToRegRate < 5
              ? "Tip: Focus on targeting quality traffic to improve click-to-registration rate."
              : regToFtdRate < 20
              ? "Tip: Encourage new registrations to make their first deposit."
              : "Great job! Your conversion rates are performing well."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
