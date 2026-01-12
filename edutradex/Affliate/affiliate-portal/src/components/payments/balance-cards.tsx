"use client";

import {
  Wallet,
  Clock,
  TrendingUp,
  ArrowDownRight,
  Calendar,
  Info,
} from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getLevelConfig,
  getNextWithdrawalDay,
  canWithdrawToday,
  WITHDRAWAL_CONFIG,
} from "@/lib/constants";

interface BalanceCardsProps {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  level: PartnerLevel;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

export function BalanceCards({
  availableBalance,
  pendingBalance,
  totalEarned,
  totalWithdrawn,
  level,
}: BalanceCardsProps) {
  const levelConfig = getLevelConfig(level);
  const canWithdraw = canWithdrawToday(level);
  const nextWithdrawalDay = getNextWithdrawalDay(level);

  const cards = [
    {
      label: "Available Balance",
      value: formatCurrency(availableBalance),
      icon: Wallet,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      description: "Ready to withdraw",
      highlight: true,
    },
    {
      label: "Pending Balance",
      value: formatCurrency(pendingBalance),
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      description: "Awaiting settlement",
    },
    {
      label: "Total Earned",
      value: formatCurrency(totalEarned),
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      description: "Lifetime earnings",
    },
    {
      label: "Total Withdrawn",
      value: formatCurrency(totalWithdrawn),
      icon: ArrowDownRight,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      description: "Successfully paid out",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Balance Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={cn(
                "glass-card",
                card.highlight && "ring-1 ring-green-500/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{card.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </div>
                  <div className={cn("rounded-lg p-2", card.bgColor)}>
                    <Icon className={cn("h-5 w-5", card.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Withdrawal Info Card */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg p-2 bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Withdrawal Schedule</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      canWithdraw
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {canWithdraw ? "Available Today" : `Next: ${nextWithdrawalDay}`}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {levelConfig.name} level:{" "}
                  {levelConfig.withdrawalFrequency === "daily"
                    ? "Daily withdrawals"
                    : levelConfig.withdrawalFrequency === "twice_per_week"
                    ? "Monday & Thursday"
                    : "Monday only"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Info className="h-4 w-4" />
                      <span>Min: ${WITHDRAWAL_CONFIG.MIN_AMOUNT}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Minimum withdrawal amount</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {(levelConfig.rate * 100).toFixed(0)}%
                </span>{" "}
                revenue share
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
