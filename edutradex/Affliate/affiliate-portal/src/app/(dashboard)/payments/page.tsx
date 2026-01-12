import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { WithdrawalService } from "@/services/withdrawal.service";
import { PaymentsHeader } from "@/components/payments/payments-header";
import { BalanceCards } from "@/components/payments/balance-cards";
import { WithdrawalHistory } from "@/components/payments/withdrawal-history";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Payments",
  description: "Manage your withdrawals and view payment history",
};

async function PaymentsContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const [partner, withdrawalsData] = await Promise.all([
    db.partner.findUnique({
      where: { id: session.user.id },
      select: {
        availableBalance: true,
        pendingBalance: true,
        totalEarned: true,
        totalWithdrawn: true,
        level: true,
      },
    }),
    WithdrawalService.getPartnerWithdrawals(session.user.id, {
      page: 1,
      pageSize: 20,
    }),
  ]);

  if (!partner) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <PaymentsHeader />
      <BalanceCards
        availableBalance={Number(partner.availableBalance)}
        pendingBalance={Number(partner.pendingBalance)}
        totalEarned={Number(partner.totalEarned)}
        totalWithdrawn={Number(partner.totalWithdrawn)}
        level={partner.level}
      />
      <WithdrawalHistory
        initialData={withdrawalsData}
        partnerId={session.user.id}
      />
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading payments..." />}>
      <PaymentsContent />
    </Suspense>
  );
}
