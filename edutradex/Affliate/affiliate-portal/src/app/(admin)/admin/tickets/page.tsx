import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { MessageSquare, Eye, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";

import { AdminTicketsService } from "@/services/admin/tickets.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoading } from "@/components/shared/loading";

export const metadata: Metadata = {
  title: "Support Tickets",
  description: "Manage partner support tickets",
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
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    case "MEDIUM":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "HIGH":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "URGENT":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-400 border-gray-500/20";
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

async function TicketsContent() {
  const { data: tickets, total } = await AdminTicketsService.getTickets({
    page: 1,
    pageSize: 50,
  });

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const inProgressCount = tickets.filter((t) => t.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-muted-foreground">
            {total} total tickets • {openCount} open • {inProgressCount} in progress
          </p>
        </div>
      </div>

      {/* Tickets Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            All Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="font-medium hover:text-blue-400 transition-colors"
                        >
                          {ticket.subject}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.partner.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {ticket.partner.email}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-xs ${getLevelColor(ticket.partner.level)}`}
                          >
                            {ticket.partner.level}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{ticket.category}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusConfig.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityConfig(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="bg-muted px-2 py-1 rounded-md text-sm">
                          {ticket.messageCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div>
                          <p>{new Date(ticket.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs">
                            {new Date(ticket.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link href={`/admin/tickets/${ticket.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminTicketsPage() {
  return (
    <Suspense fallback={<PageLoading message="Loading tickets..." />}>
      <TicketsContent />
    </Suspense>
  );
}
