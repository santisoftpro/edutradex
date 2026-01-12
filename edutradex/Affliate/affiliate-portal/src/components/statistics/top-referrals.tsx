"use client";

import { useState } from "react";
import { Trophy, Link2, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TopTrader {
  id: string;
  tradingUid: string;
  country: string | null;
  totalDeposits: number;
  turnover: number;
  registeredAt: Date;
  ftdDate: Date | null;
  ftdAmount: number | null;
  totalCommission: number;
}

interface TopLink {
  id: string;
  code: string;
  comment: string | null;
  clicks: number;
  registrations: number;
  ftds: number;
  conversionRate: string;
}

interface TopReferralsProps {
  traders: TopTrader[];
  links: TopLink[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getCountryFlag(country: string | null): string {
  if (!country) return "🌍";
  const flags: Record<string, string> = {
    US: "🇺🇸",
    GB: "🇬🇧",
    DE: "🇩🇪",
    FR: "🇫🇷",
    ES: "🇪🇸",
    IT: "🇮🇹",
    CA: "🇨🇦",
    AU: "🇦🇺",
    BR: "🇧🇷",
    IN: "🇮🇳",
    JP: "🇯🇵",
    KR: "🇰🇷",
    RU: "🇷🇺",
    CN: "🇨🇳",
    MX: "🇲🇽",
    AE: "🇦🇪",
    SA: "🇸🇦",
    NG: "🇳🇬",
    ZA: "🇿🇦",
    PH: "🇵🇭",
  };
  return flags[country.toUpperCase()] || "🌍";
}

export function TopReferrals({ traders, links }: TopReferralsProps) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top Performers
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="traders">
          <TabsList className="w-full bg-muted/50 mb-4">
            <TabsTrigger value="traders" className="flex-1">
              <Users className="h-4 w-4 mr-1" />
              Top Traders
            </TabsTrigger>
            <TabsTrigger value="links" className="flex-1">
              <Link2 className="h-4 w-4 mr-1" />
              Top Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="traders" className="mt-0">
            {traders.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No FTD traders yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your top performing traders will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {traders.slice(0, 5).map((trader, index) => (
                  <div
                    key={trader.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-border"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0
                          ? "bg-amber-500/20 text-amber-400"
                          : index === 1
                          ? "bg-slate-400/20 text-slate-400"
                          : index === 2
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCountryFlag(trader.country)}</span>
                        <span className="font-medium truncate">
                          {trader.tradingUid.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Deposited {formatCurrency(trader.totalDeposits)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-green-400">
                        {formatCurrency(trader.totalCommission)}
                      </p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="mt-0">
            {links.length === 0 ? (
              <div className="text-center py-8">
                <Link2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No links created yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create tracking links to see their performance
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link, index) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-border"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                        index === 0
                          ? "bg-amber-500/20 text-amber-400"
                          : index === 1
                          ? "bg-slate-400/20 text-slate-400"
                          : index === 2
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {link.comment || link.code}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatNumber(link.clicks)} clicks</span>
                        <span>•</span>
                        <span>{link.registrations} regs</span>
                        <span>•</span>
                        <span>{link.ftds} FTDs</span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        Number(link.conversionRate) >= 2
                          ? "text-green-400 border-green-500/30"
                          : "text-muted-foreground"
                      )}
                    >
                      {link.conversionRate}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
