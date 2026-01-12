"use client";

import { useState } from "react";
import { LifeBuoy, Plus, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateTicketDialog } from "./create-ticket-dialog";

interface SupportHeaderProps {
  totalTickets: number;
  openCount: number;
  pendingCount: number;
  closedCount: number;
}

export function SupportHeader({
  totalTickets,
  openCount,
  pendingCount,
  closedCount,
}: SupportHeaderProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const stats = [
    {
      label: "Open",
      value: openCount,
      icon: MessageSquare,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Pending",
      value: pendingCount,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Closed",
      value: closedCount,
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            Support
          </h1>
          <p className="text-muted-foreground">
            Get help and manage your support tickets.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label} Tickets</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <CreateTicketDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  );
}
