import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { TicketDetail } from "@/components/support/ticket-detail";
import { PageLoading } from "@/components/shared/loading";

interface TicketPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TicketPageProps): Promise<Metadata> {
  const { id } = await params;

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    select: { ticketNumber: true, subject: true },
  });

  if (!ticket) {
    return { title: "Ticket Not Found" };
  }

  return {
    title: `Ticket #${ticket.ticketNumber}`,
    description: ticket.subject,
  };
}

async function TicketContent({ id }: { id: string }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const ticket = await db.supportTicket.findFirst({
    where: {
      id,
      partnerId: session.user.id,
    },
    select: {
      id: true,
      ticketNumber: true,
      category: true,
      subject: true,
      message: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      closedAt: true,
      replies: {
        select: {
          id: true,
          message: true,
          isFromAdmin: true,
          adminName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return <TicketDetail ticket={ticket} />;
}

export default async function TicketPage({ params }: TicketPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading message="Loading ticket..." />}>
      <TicketContent id={id} />
    </Suspense>
  );
}
