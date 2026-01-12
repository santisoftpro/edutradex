"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Filter,
  Search,
  DollarSign,
  Award,
  Link2,
  User,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import type { TicketCategory, TicketStatus, TicketPriority } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  replyCount: number;
  lastReply: {
    isFromAdmin: boolean;
    createdAt: Date;
  } | null;
}

interface TicketsListProps {
  tickets: Ticket[];
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
  PAYMENTS_WITHDRAWALS: { label: "Payments", icon: DollarSign },
  AFFILIATE_LEVEL: { label: "Level", icon: Award },
  LINKS_TRACKING: { label: "Links", icon: Link2 },
  ACCOUNT_LOGIN: { label: "Account", icon: User },
  FRAUD_REPORT: { label: "Fraud", icon: AlertTriangle },
  OTHER: { label: "Other", icon: HelpCircle },
};

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TicketsList({ tickets }: TicketsListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      search === "" ||
      ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
      ticket.ticketNumber.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Your Tickets</CardTitle>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-[200px]"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REPLIED">Replied</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search || statusFilter !== "all"
                ? "No tickets match your filters"
                : "No support tickets yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create a ticket if you need help"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const status = statusConfig[ticket.status];
              const priority = priorityConfig[ticket.priority];
              const category = categoryConfig[ticket.category];
              const StatusIcon = status.icon;
              const CategoryIcon = category.icon;

              return (
                <Link
                  key={ticket.id}
                  href={`/support/${ticket.id}`}
                  className="block"
                >
                  <div
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:border-primary/50",
                      ticket.status === "REPLIED"
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-white/5 border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("p-2 rounded-lg", status.bgColor)}>
                          <StatusIcon className={cn("h-4 w-4", status.color)} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground">
                              #{ticket.ticketNumber}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", status.color)}
                            >
                              {status.label}
                            </Badge>
                            {ticket.priority !== "NORMAL" && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs", priority.color)}
                              >
                                {priority.label}
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-medium mt-1 truncate">
                            {ticket.subject}
                          </h3>

                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CategoryIcon className="h-3.5 w-3.5" />
                              <span>{category.label}</span>
                            </div>
                            <span>•</span>
                            <span>{formatDate(ticket.createdAt)}</span>
                            {ticket.replyCount > 0 && (
                              <>
                                <span>•</span>
                                <span>{ticket.replyCount} replies</span>
                              </>
                            )}
                          </div>

                          {ticket.lastReply && ticket.status === "REPLIED" && (
                            <p className="text-sm text-green-400 mt-2">
                              New reply from support • {formatDate(ticket.lastReply.createdAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
