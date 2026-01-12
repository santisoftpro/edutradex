import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TrackingService } from "@/services/tracking.service";
import { LinksHeader } from "@/components/links/links-header";
import { LinksTable } from "@/components/links/links-table";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Links",
  description: "Manage your affiliate tracking links",
};

async function LinksContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const linksData = await TrackingService.getPartnerLinks(session.user.id, {
    page: 1,
    pageSize: 50,
  });

  return (
    <div className="space-y-6">
      <LinksHeader totalLinks={linksData.total} />
      <LinksTable initialData={linksData} partnerId={session.user.id} />
    </div>
  );
}

export default function LinksPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading links..." />}>
      <LinksContent />
    </Suspense>
  );
}
