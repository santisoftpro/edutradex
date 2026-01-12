"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  DollarSign,
  TrendingUp,
  Wallet,
  Bell,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: "registration" | "ftd" | "commission" | "withdrawal" | "notification";
  title: string;
  description: string;
  timestamp: Date;
  amount?: number;
}

interface RecentActivityProps {
  partnerId: string;
}

const activityIcons = {
  registration: UserPlus,
  ftd: DollarSign,
  commission: TrendingUp,
  withdrawal: Wallet,
  notification: Bell,
};

const activityColors = {
  registration: "text-blue-400 bg-blue-500/10",
  ftd: "text-green-400 bg-green-500/10",
  commission: "text-purple-400 bg-purple-500/10",
  withdrawal: "text-amber-400 bg-amber-500/10",
  notification: "text-cyan-400 bg-cyan-500/10",
};

// Mock data - In production, this would come from an API
function getMockActivity(): ActivityItem[] {
  const now = new Date();
  return [
    {
      id: "1",
      type: "commission",
      title: "Commission Credited",
      description: "Daily settlement processed",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      amount: 45.5,
    },
    {
      id: "2",
      type: "ftd",
      title: "New FTD",
      description: "Trader T****87 made first deposit",
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      amount: 500,
    },
    {
      id: "3",
      type: "registration",
      title: "New Registration",
      description: "New trader signed up via your link",
      timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
    {
      id: "4",
      type: "withdrawal",
      title: "Withdrawal Completed",
      description: "Your withdrawal has been processed",
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      amount: 200,
    },
    {
      id: "5",
      type: "notification",
      title: "Level Progress",
      description: "You're 5 FTDs away from Builder level",
      timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
  ];
}

export function RecentActivity({ partnerId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const fetchActivity = async () => {
      // In production: const data = await fetch(`/api/activity?partnerId=${partnerId}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setActivities(getMockActivity());
      setIsLoading(false);
    };

    fetchActivity();
  }, [partnerId]);

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/statistics" className="text-primary">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              const colorClasses = activityColors[activity.type];

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 group"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      colorClasses
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                      {activity.amount && (
                        <span className="text-sm font-medium text-green-400 shrink-0">
                          ${activity.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(activity.timestamp, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
