"use client";

import { TrendingUp } from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { getLevelConfig } from "@/lib/constants";

interface LevelHeaderProps {
  currentLevel: PartnerLevel;
}

const levelColors: Record<PartnerLevel, string> = {
  STARTER: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  BUILDER: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  GROWTH: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  ADVANCED: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PRO: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  AMBASSADOR: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export function LevelHeader({ currentLevel }: LevelHeaderProps) {
  const config = getLevelConfig(currentLevel);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Affiliate Level
        </h1>
        <p className="text-muted-foreground">
          Track your progress and unlock higher revenue shares.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={`text-sm px-3 py-1 ${levelColors[currentLevel]}`}>
          {config.name} Level
        </Badge>
        <span className="text-lg font-bold text-green-400">
          {(config.rate * 100).toFixed(0)}% Revenue Share
        </span>
      </div>
    </div>
  );
}
