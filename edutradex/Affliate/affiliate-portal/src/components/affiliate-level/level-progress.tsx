"use client";

import { ArrowRight, Lock, Users, Share2 } from "lucide-react";
import type { PartnerLevel } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PARTNER_LEVELS, getLevelConfig } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LevelProgressProps {
  currentLevel: PartnerLevel;
  totalFTD: number;
  verifiedSocialChannels: number;
}

const levelOrder: PartnerLevel[] = [
  "STARTER",
  "BUILDER",
  "GROWTH",
  "ADVANCED",
  "PRO",
  "AMBASSADOR",
];

const levelColors: Record<PartnerLevel, string> = {
  STARTER: "text-blue-400 bg-blue-500/20",
  BUILDER: "text-indigo-400 bg-indigo-500/20",
  GROWTH: "text-violet-400 bg-violet-500/20",
  ADVANCED: "text-purple-400 bg-purple-500/20",
  PRO: "text-fuchsia-400 bg-fuchsia-500/20",
  AMBASSADOR: "text-amber-400 bg-amber-500/20",
};

export function LevelProgress({
  currentLevel,
  totalFTD,
  verifiedSocialChannels,
}: LevelProgressProps) {
  const currentConfig = getLevelConfig(currentLevel);
  const currentIndex = levelOrder.indexOf(currentLevel);
  const nextLevel = currentIndex < levelOrder.length - 1 ? levelOrder[currentIndex + 1] : null;
  const nextConfig = nextLevel ? getLevelConfig(nextLevel) : null;

  // Calculate progress to next level
  let ftdProgress = 100;
  let ftdRequired = 0;
  let socialRequired = false;
  let hasSocialRequirement = false;

  if (nextConfig && nextLevel) {
    ftdRequired = PARTNER_LEVELS[nextLevel].ftdRequired;
    const prevRequired = currentIndex > 0
      ? PARTNER_LEVELS[levelOrder[currentIndex]].ftdRequired
      : 0;
    const ftdRange = ftdRequired - prevRequired;
    const ftdInRange = Math.max(0, totalFTD - prevRequired);
    ftdProgress = Math.min(100, (ftdInRange / ftdRange) * 100);

    socialRequired = PARTNER_LEVELS[nextLevel].socialRequired;
    hasSocialRequirement = socialRequired && verifiedSocialChannels === 0;
  }

  const isMaxLevel = currentLevel === "AMBASSADOR";

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-primary" />
          {isMaxLevel ? "Maximum Level Reached" : "Progress to Next Level"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {isMaxLevel ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/20 mb-4">
              <span className="text-3xl">🏆</span>
            </div>
            <p className="text-lg font-medium">Congratulations!</p>
            <p className="text-muted-foreground">
              You&apos;ve reached the highest partner level with {(currentConfig.rate * 100).toFixed(0)}% revenue share.
            </p>
          </div>
        ) : (
          <>
            {/* Level transition */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <Badge
                  variant="outline"
                  className={cn("mb-2", levelColors[currentLevel])}
                >
                  {currentConfig.name}
                </Badge>
                <p className="text-2xl font-bold">
                  {(currentConfig.rate * 100).toFixed(0)}%
                </p>
              </div>

              <ArrowRight className="h-6 w-6 text-muted-foreground" />

              <div className="text-center">
                <Badge
                  variant="outline"
                  className={cn("mb-2", nextLevel && levelColors[nextLevel])}
                >
                  {nextConfig?.name}
                </Badge>
                <p className="text-2xl font-bold text-green-400">
                  {nextConfig && (nextConfig.rate * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-4">
              {/* FTD Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>FTD Progress</span>
                  </div>
                  <span className="font-medium">
                    {totalFTD} / {ftdRequired} FTDs
                  </span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${ftdProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {ftdRequired - totalFTD > 0
                    ? `${ftdRequired - totalFTD} more FTDs needed`
                    : "FTD requirement met!"}
                </p>
              </div>

              {/* Social Requirement */}
              {socialRequired && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-4 w-4 text-muted-foreground" />
                      <span>Social Verification</span>
                    </div>
                    {hasSocialRequirement ? (
                      <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                        <Lock className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-400 border-green-500/30">
                        Verified
                      </Badge>
                    )}
                  </div>
                  {hasSocialRequirement && (
                    <p className="text-xs text-muted-foreground">
                      Add and verify at least one social channel to unlock this level.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Upgrade info */}
            {ftdProgress >= 100 && !hasSocialRequirement && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-400 font-medium">
                  You&apos;re eligible for an upgrade!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Level upgrades are processed automatically during the next review cycle.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
