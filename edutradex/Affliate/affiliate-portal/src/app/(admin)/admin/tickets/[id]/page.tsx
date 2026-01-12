import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, User, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

import { AdminTicketsService } from "@/services/admin/tickets.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoading } from "@/components/shared/loading";
import { TicketReplyForm } from "@/components/admin/tickets/ticket-reply-form";
import { TicketStatusSelect } from "@/components/admin/tickets/ticket-status-select";

export const metadata: Metadata = {
  title: "Ticket Details",
  description: "View and respond to support ticket",
};

function getStatusConfig(status: string) {
  switch (status) {
    case "OPEN":
      return {
        color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        icon: AlertCircle,
      };
    case "IN_PROGRESS":
      return {
        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        icon: Clock,
      };
    case "RESOLVED":
      return {
        color: "bg-green-500/10 text-green-500 border-green-500/20",
        icon: CheckCircle,
      };
    case "CLOSED":
      return {
        color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        icon: XCircle,
      };
    default:
      return {
        color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        icon: Clock,
      };
  }
}

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "LOW":
      return "bg-gray-500/10 text-gray-400";
    case "MEDIUM":
      return "bg-blue-500/10 text-blue-400";
    case "HIGH":
      return "bg-orange-500/10 text-orange-400";
    case "URGENT":
      return "bg-red-500/10 text-red-400";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case "STARTER":
      return "bg-gray-500/10 text-gray-400";
    case "BUILDER":
      return "bg-blue-500/10 text-blue-400";
    case "GROWTH":
      return "bg-green-500/10 text-green-400";
    case "ADVANCED":
      return "bg-purple-500/10 text-purple-400";
    case "PRO":
      return "bg-orange-500/10 text-orange-400";
    case "AMBASSADOR":
      return "bg-yellow-500/10 text-yellow-400";
    default:
      return "";
  }
}

async function TicketDetailContent({ id }: { id: string }) {
  const ticket = await AdminTicketsService.getTicketById(id);

  if (!ticket) {
    notFound();
  }

  const statusConfig = getStatusConfig(ticket.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tickets">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-muted-foreground">
            Ticket #{ticket.id.slice(-8).toUpperCase()}
          </p>
        </div>
        <TicketStatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ticket Info */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Ticket Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1 w-fit mt-1`}>
                <StatusIcon className="h-3 w-3" />
                {ticket.status.replace("_", " ")}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge variant="outline" className={`${getPriorityConfig(ticket.priority)} mt-1`}>
                {ticket.priority}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{ticket.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(ticket.createdAt).toLocaleDateString()}{" "}
                {new Date(ticket.createdAt).toLocaleTimeString()}
              </p>
            </div>
            {ticket.closedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Closed</p>
                <p className="font-medium">
                  {new Date(ticket.closedAt).toLocaleDateString()}{" "}
                  {new Date(ticket.closedAt).toLocaleTimeString()}
                </p>
              </div>
            )}

            <hr className="border-border" />

            <div>
              <p className="text-sm text-muted-foreground mb-2">Partner</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{ticket.partner.name}</p>
                  <p className="text-sm text-muted-foreground">{ticket.partner.email}</p>
                </div>
              </div>
              <Badge variant="outline" className={`${getLevelColor(ticket.partner.level)} mt-2`}>
                {ticket.partner.level}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation ({ticket.messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.isAdminReply
                      ? "bg-red-500/10 border border-red-500/20 ml-8"
                      : "bg-muted mr-8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${message.isAdminReply ? "text-red-400" : ""}`}>
                      {message.isAdminReply ? "Admin" : ticket.partner.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.createdAt).toLocaleDateString()}{" "}
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((attachment, index) => (
                        <a
                          key={index}
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          Attachment {index + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {ticket.status !== "CLOSED" && (
              <div className="mt-6 pt-4 border-t border-border">
                <TicketReplyForm ticketId={ticket.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<PageLoading message="Loading ticket..." />}>
      <TicketDetailContent id={id} />
    </Suspense>
  );
}
