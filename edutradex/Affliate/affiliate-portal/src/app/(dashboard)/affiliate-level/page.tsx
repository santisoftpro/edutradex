import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LevelHeader } from "@/components/affiliate-level/level-header";
import { CurrentLevelCard } from "@/components/affiliate-level/current-level-card";
import { LevelProgress } from "@/components/affiliate-level/level-progress";
import { AllLevelsOverview } from "@/components/affiliate-level/all-levels-overview";
import { SocialVerification } from "@/components/affiliate-level/social-verification";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Affiliate Level",
  description: "View your affiliate level and progress towards the next tier",
};

async function AffiliateLevelContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [partner, socialChannels] = await Promise.all([
    db.partner.findUnique({
      where: { id: session.user.id },
      select: {
        level: true,
        totalFTD: true,
        totalEarned: true,
        socialStatus: true,
      },
    }),
    db.socialChannel.findMany({
      where: { partnerId: session.user.id },
      select: {
        id: true,
        platform: true,
        profileUrl: true,
        username: true,
        followersCount: true,
        status: true,
        verifiedAt: true,
        rejectionReason: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!partner) {
    redirect("/login");
  }

  const verifiedChannels = socialChannels.filter((c) => c.status === "VERIFIED");

  return (
    <div className="space-y-6">
      <LevelHeader currentLevel={partner.level} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CurrentLevelCard
            level={partner.level}
            totalFTD={partner.totalFTD}
            totalEarned={Number(partner.totalEarned)}
          />
          <LevelProgress
            currentLevel={partner.level}
            totalFTD={partner.totalFTD}
            verifiedSocialChannels={verifiedChannels.length}
          />
        </div>

        <div>
          <SocialVerification
            channels={socialChannels}
            socialStatus={partner.socialStatus}
            currentLevel={partner.level}
          />
        </div>
      </div>

      <AllLevelsOverview currentLevel={partner.level} />
    </div>
  );
}

export default function AffiliateLevelPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading level info..." />}>
      <AffiliateLevelContent />
    </Suspense>
  );
}
