"use client";

import { Globe, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CountryData {
  country: string | null;
  _count: number;
}

interface GeographicBreakdownProps {
  data: CountryData[];
  totalTraders: number;
}

const countryNames: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  CA: "Canada",
  AU: "Australia",
  BR: "Brazil",
  IN: "India",
  JP: "Japan",
  KR: "South Korea",
  RU: "Russia",
  CN: "China",
  MX: "Mexico",
  AE: "UAE",
  SA: "Saudi Arabia",
  NG: "Nigeria",
  ZA: "South Africa",
  PH: "Philippines",
  PL: "Poland",
  NL: "Netherlands",
  SE: "Sweden",
  TR: "Turkey",
  ID: "Indonesia",
  TH: "Thailand",
  VN: "Vietnam",
  MY: "Malaysia",
  SG: "Singapore",
  EG: "Egypt",
  PK: "Pakistan",
  AR: "Argentina",
  CO: "Colombia",
  CL: "Chile",
  PE: "Peru",
};

const countryFlags: Record<string, string> = {
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
  PL: "🇵🇱",
  NL: "🇳🇱",
  SE: "🇸🇪",
  TR: "🇹🇷",
  ID: "🇮🇩",
  TH: "🇹🇭",
  VN: "🇻🇳",
  MY: "🇲🇾",
  SG: "🇸🇬",
  EG: "🇪🇬",
  PK: "🇵🇰",
  AR: "🇦🇷",
  CO: "🇨🇴",
  CL: "🇨🇱",
  PE: "🇵🇪",
};

const barColors = [
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-green-500",
];

export function GeographicBreakdown({ data, totalTraders }: GeographicBreakdownProps) {
  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d._count)) : 0;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Geographic Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Where your referrals come from
        </p>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No geographic data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Country data will appear as you get referrals
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => {
              const countryCode = item.country?.toUpperCase() || "UNKNOWN";
              const flag = countryFlags[countryCode] || "🌍";
              const name = countryNames[countryCode] || item.country || "Unknown";
              const percentage = totalTraders > 0 ? (item._count / totalTraders) * 100 : 0;
              const barWidth = maxCount > 0 ? (item._count / maxCount) * 100 : 0;

              return (
                <div key={item.country || "unknown"} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{flag}</span>
                      <span className="font-medium">{name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {item._count} traders
                      </span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        barColors[index % barColors.length]
                      )}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {data.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Countries</span>
              <span className="font-medium">{data.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Total Traders</span>
              <span className="font-medium">{totalTraders}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
