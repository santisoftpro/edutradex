"use client";

import {
  CheckCircle,
  Link2,
  Share2,
  Users,
  DollarSign,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const steps = [
  {
    step: 1,
    title: "Create Your First Link",
    description:
      "Go to the Links page and create a tracking link. Choose a link type based on where you'll share it.",
    icon: Link2,
    tips: [
      "Use descriptive names for your links",
      "Create separate links for different platforms",
      "Use the REGISTER type for most campaigns",
    ],
  },
  {
    step: 2,
    title: "Share Your Links",
    description:
      "Promote your tracking links across your channels - social media, websites, emails, or communities.",
    icon: Share2,
    tips: [
      "Focus on quality over quantity",
      "Target audiences interested in trading",
      "Be transparent about affiliate relationships",
    ],
  },
  {
    step: 3,
    title: "Track Your Referrals",
    description:
      "Monitor your dashboard and statistics to see clicks, registrations, and FTDs (First Time Deposits).",
    icon: Users,
    tips: [
      "Check your stats daily",
      "Identify which links perform best",
      "Optimize based on conversion rates",
    ],
  },
  {
    step: 4,
    title: "Earn Commissions",
    description:
      "Earn revenue share from your referrals' trading activity. Commissions are calculated daily and settled automatically.",
    icon: DollarSign,
    tips: [
      "FTD is required for commission eligibility",
      "Higher levels = higher revenue share",
      "Commissions are credited to your balance",
    ],
  },
  {
    step: 5,
    title: "Withdraw Your Earnings",
    description:
      "Once you have earnings, request a withdrawal via crypto or internal transfer based on your level's schedule.",
    icon: Rocket,
    tips: [
      "Minimum withdrawal is $50",
      "Withdrawal frequency depends on your level",
      "Keep your wallet addresses up to date",
    ],
  },
];

export function GettingStartedGuide() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Getting Started Guide
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.step} className="relative">
                {/* Connector Line */}
                {!isLast && (
                  <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
                )}

                <div className="flex gap-4">
                  {/* Step Number */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {step.step}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground mb-3">{step.description}</p>

                    {/* Tips */}
                    <div className="space-y-1.5">
                      {step.tips.map((tip, tipIndex) => (
                        <div
                          key={tipIndex}
                          className="flex items-start gap-2 text-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
