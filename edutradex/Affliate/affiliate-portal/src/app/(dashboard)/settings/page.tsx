import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SettingsHeader } from "@/components/settings/settings-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your account settings and preferences",
};

async function SettingsContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const partner = await db.partner.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      phone: true,
      country: true,
      level: true,
      twoFactorEnabled: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  if (!partner) {
    redirect("/login");
  }

  // Get saved withdrawal addresses from recent withdrawals
  const recentWithdrawals = await db.withdrawal.findMany({
    where: {
      partnerId: session.user.id,
      method: "CRYPTO",
      address: { not: null },
    },
    select: {
      coin: true,
      network: true,
      address: true,
    },
    distinct: ["address"],
    orderBy: { requestedAt: "desc" },
    take: 10,
  });

  const savedAddresses = recentWithdrawals
    .filter((w) => w.address && w.coin && w.network)
    .map((w) => ({
      coin: w.coin!,
      network: w.network!,
      address: w.address!,
    }));

  return (
    <div className="space-y-6">
      <SettingsHeader />
      <SettingsTabs partner={partner} savedAddresses={savedAddresses} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading settings..." />}>
      <SettingsContent />
    </Suspense>
  );
}
