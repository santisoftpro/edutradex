"use client";

import Link from "next/link";
import {
  Link2,
  DollarSign,
  Award,
  BarChart3,
  Users,
  Shield,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const helpTopics = [
  {
    title: "Tracking Links",
    description: "Learn how to create and manage your affiliate links",
    icon: Link2,
    href: "#links",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Payments",
    description: "Understand withdrawals, fees, and payment schedules",
    icon: DollarSign,
    href: "#payments",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Partner Levels",
    description: "Learn about level requirements and revenue shares",
    icon: Award,
    href: "#levels",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Statistics",
    description: "How to read and use your analytics dashboard",
    icon: BarChart3,
    href: "#statistics",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Referrals & FTD",
    description: "Understanding FTD tracking and commissions",
    icon: Users,
    href: "#referrals",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  {
    title: "Account Security",
    description: "Keep your account safe with 2FA and best practices",
    icon: Shield,
    href: "#security",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
];

export function QuickHelpCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {helpTopics.map((topic) => {
        const Icon = topic.icon;

        return (
          <Link key={topic.title} href={topic.href}>
            <Card className="glass-card h-full hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className={`inline-flex p-3 rounded-lg ${topic.bgColor} mb-4`}>
                  <Icon className={`h-6 w-6 ${topic.color}`} />
                </div>
                <h3 className="font-semibold mb-2">{topic.title}</h3>
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
