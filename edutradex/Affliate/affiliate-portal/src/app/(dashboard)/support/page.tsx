import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SupportHeader } from "@/components/support/support-header";
import { TicketsList } from "@/components/support/tickets-list";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help and manage your support tickets",
};

async function SupportContent() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const tickets = await db.supportTicket.findMany({
    where: { partnerId: session.user.id },
    select: {
      id: true,
      ticketNumber: true,
      category: true,
      subject: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      closedAt: true,
      _count: {
        select: { replies: true },
      },
      replies: {
        select: {
          isFromAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const processedTickets = tickets.map((ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    category: ticket.category,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    closedAt: ticket.closedAt,
    replyCount: ticket._count.replies,
    lastReply: ticket.replies[0] || null,
  }));

  // Get ticket stats
  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const pendingCount = tickets.filter((t) => t.status === "PENDING" || t.status === "REPLIED").length;
  const closedCount = tickets.filter((t) => t.status === "CLOSED").length;

  return (
    <div className="space-y-6">
      <SupportHeader
        totalTickets={tickets.length}
        openCount={openCount}
        pendingCount={pendingCount}
        closedCount={closedCount}
      />
      <TicketsList tickets={processedTickets} />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading support tickets..." />}>
      <SupportContent />
    </Suspense>
  );
}
