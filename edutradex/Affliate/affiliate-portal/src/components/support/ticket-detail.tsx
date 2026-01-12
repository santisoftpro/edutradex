"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Headphones,
  DollarSign,
  Award,
  Link2,
  AlertTriangle,
  HelpCircle,
  XCircle,
} from "lucide-react";
import type { TicketCategory, TicketStatus, TicketPriority } from "@prisma/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Reply {
  id: string;
  message: string;
  isFromAdmin: boolean;
  adminName: string | null;
  createdAt: Date;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  replies: Reply[];
}

interface TicketDetailProps {
  ticket: Ticket;
}

const statusConfig: Record<
  TicketStatus,
  { label: string; icon: typeof MessageSquare; color: string; bgColor: string }
> = {
  OPEN: {
    label: "Open",
    icon: MessageSquare,
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/30",
  },
  PENDING: {
    label: "Pending",
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/30",
  },
  REPLIED: {
    label: "Replied",
    icon: AlertCircle,
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/30",
  },
  CLOSED: {
    label: "Closed",
    icon: CheckCircle,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 border-border",
  },
};

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-muted-foreground" },
  NORMAL: { label: "Normal", color: "text-blue-400" },
  HIGH: { label: "High", color: "text-amber-400" },
  URGENT: { label: "Urgent", color: "text-red-400" },
};

const categoryConfig: Record<
  TicketCategory,
  { label: string; icon: typeof DollarSign }
> = {
  PAYMENTS_WITHDRAWALS: { label: "Payments & Withdrawals", icon: DollarSign },
  AFFILIATE_LEVEL: { label: "Affiliate Level", icon: Award },
  LINKS_TRACKING: { label: "Links & Tracking", icon: Link2 },
  ACCOUNT_LOGIN: { label: "Account & Login", icon: User },
  FRAUD_REPORT: { label: "Fraud Report", icon: AlertTriangle },
  OTHER: { label: "Other", icon: HelpCircle },
};

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TicketDetail({ ticket }: TicketDetailProps) {
  const router = useRouter();
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];
  const category = categoryConfig[ticket.category];
  const StatusIcon = status.icon;
  const CategoryIcon = category.icon;

  const isClosed = ticket.status === "CLOSED";

  async function handleSubmitReply() {
    if (!replyMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (!response.ok) {
        throw new Error("Failed to send reply");
      }

      toast.success("Reply sent successfully");
      setReplyMessage("");
      router.refresh();
    } catch (error) {
      toast.error("Failed to send reply");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCloseTicket() {
    setIsClosing(true);

    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}/close`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to close ticket");
      }

      toast.success("Ticket closed");
      router.refresh();
    } catch (error) {
      toast.error("Failed to close ticket");
    } finally {
      setIsClosing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/support">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">Ticket #{ticket.ticketNumber}</h1>
            <Badge variant="outline" className={cn(status.color, status.bgColor)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            {ticket.priority !== "NORMAL" && (
              <Badge variant="outline" className={priority.color}>
                {priority.label}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1">{ticket.subject}</p>
        </div>

        {!isClosed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <XCircle className="h-4 w-4 mr-2" />
                Close Ticket
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card">
              <AlertDialogHeader>
                <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will close the ticket. You can always create a new ticket if you
                  need further assistance.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCloseTicket} disabled={isClosing}>
                  {isClosing ? "Closing..." : "Close Ticket"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-4">
          {/* Original Message */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">You</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap">{ticket.message}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Replies */}
          {ticket.replies.map((reply) => (
            <Card
              key={reply.id}
              className={cn(
                "glass-card",
                reply.isFromAdmin && "border-primary/30 bg-primary/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center",
                      reply.isFromAdmin ? "bg-primary/20" : "bg-muted"
                    )}
                  >
                    {reply.isFromAdmin ? (
                      <Headphones className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {reply.isFromAdmin ? reply.adminName || "Support Team" : "You"}
                        </p>
                        {reply.isFromAdmin && (
                          <Badge variant="outline" className="text-xs text-primary">
                            Support
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(reply.createdAt)}
                      </p>
                    </div>
                    <div className="mt-2 text-sm whitespace-pre-wrap">{reply.message}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Reply Form */}
          {!isClosed ? (
            <Card className="glass-card">
              <CardContent className="p-4">
                <Textarea
                  placeholder="Type your reply..."
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                />
                <div className="flex justify-end mt-3">
                  <Button
                    onClick={handleSubmitReply}
                    disabled={isSubmitting || !replyMessage.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-card">
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  This ticket is closed. Create a new ticket if you need further assistance.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm">{category.label}</span>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant="outline" className={cn(status.color, status.bgColor)}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Priority</p>
                <span className={cn("text-sm font-medium", priority.color)}>
                  {priority.label}
                </span>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm">{formatDateTime(ticket.createdAt)}</p>
              </div>

              {ticket.closedAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Closed</p>
                    <p className="text-sm">{formatDateTime(ticket.closedAt)}</p>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-1">Replies</p>
                <p className="text-sm">{ticket.replies.length}</p>
              </div>
            </CardContent>
          </Card>

          {/* Help Card */}
          <Card className="glass-card">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Need quick help?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Check our FAQ for instant answers to common questions.
              </p>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/help">View FAQ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
