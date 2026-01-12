"use client";

import { Check, Lock, Star, Calendar, Users, Share2 } from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PARTNER_LEVELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AllLevelsOverviewProps {
  currentLevel: PartnerLevel;
}

const levelOrder: PartnerLevel[] = [
  "STARTER",
  "BUILDER",
  "GROWTH",
  "ADVANCED",
  "PRO",
  "AMBASSADOR",
];

const levelColors: Record<PartnerLevel, { bg: string; text: string; border: string }> = {
  STARTER: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  BUILDER: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
  },
  GROWTH: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
  },
  ADVANCED: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  PRO: {
    bg: "bg-fuchsia-500/10",
    text: "text-fuchsia-400",
    border: "border-fuchsia-500/30",
  },
  AMBASSADOR: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
};

export function AllLevelsOverview({ currentLevel }: AllLevelsOverviewProps) {
  const currentIndex = levelOrder.indexOf(currentLevel);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-primary" />
          All Partner Levels
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {levelOrder.map((level, index) => {
            const config = PARTNER_LEVELS[level];
            const colors = levelColors[level];
            const isCurrentLevel = level === currentLevel;
            const isUnlocked = index <= currentIndex;
            const isLocked = index > currentIndex;

            return (
              <div
                key={level}
                className={cn(
                  "relative rounded-xl border p-4 transition-all",
                  isCurrentLevel
                    ? `${colors.border} ${colors.bg} ring-2 ring-primary/50`
                    : isLocked
                    ? "border-border bg-muted/30 opacity-60"
                    : `${colors.border} ${colors.bg}`
                )}
              >
                {/* Current badge */}
                {isCurrentLevel && (
                  <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                    Current
                  </Badge>
                )}

                {/* Lock icon for locked levels */}
                {isLocked && (
                  <Lock className="absolute top-3 right-3 h-4 w-4 text-muted-foreground" />
                )}

                {/* Level header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center text-lg font-bold",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className={cn("font-semibold", isLocked ? "text-muted-foreground" : colors.text)}>
                      {config.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Level {config.level}</p>
                  </div>
                </div>

                {/* Revenue share */}
                <div className="mb-3">
                  <p className={cn(
                    "text-2xl font-bold",
                    isLocked ? "text-muted-foreground" : "text-green-400"
                  )}>
                    {(config.rate * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue Share</p>
                </div>

                {/* Requirements */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {isUnlocked ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={isLocked ? "text-muted-foreground" : ""}>
                      {config.ftdRequired}+ FTDs
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUnlocked ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={isLocked ? "text-muted-foreground" : ""}>
                      {config.withdrawalFrequency === "daily"
                        ? "Daily withdrawals"
                        : config.withdrawalFrequency === "twice_per_week"
                        ? "Mon & Thu withdrawals"
                        : "Weekly withdrawals"}
                    </span>
                  </div>

                  {config.socialRequired && (
                    <div className="flex items-center gap-2">
                      {isUnlocked ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={isLocked ? "text-muted-foreground" : ""}>
                        Social required
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
