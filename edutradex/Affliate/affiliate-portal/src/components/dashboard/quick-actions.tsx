"use client";

import Link from "next/link";
import {
  Link as LinkIcon,
  Wallet,
  TrendingUp,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  {
    label: "Create New Link",
    description: "Generate a tracking link",
    href: "/links?action=create",
    icon: LinkIcon,
    variant: "default" as const,
  },
  {
    label: "Request Withdrawal",
    description: "Withdraw your earnings",
    href: "/payments?action=withdraw",
    icon: Wallet,
    variant: "outline" as const,
  },
  {
    label: "View Level Progress",
    description: "Check your level status",
    href: "/affiliate-level",
    icon: TrendingUp,
    variant: "outline" as const,
  },
  {
    label: "Get Support",
    description: "Contact our team",
    href: "/support",
    icon: HelpCircle,
    variant: "outline" as const,
  },
];

export function QuickActions() {
  return (
    <Card className="glass-card h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.href}
              variant={action.variant}
              className="w-full justify-start h-auto py-3"
              asChild
            >
              <Link href={action.href}>
                <Icon className="mr-3 h-4 w-4 shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
