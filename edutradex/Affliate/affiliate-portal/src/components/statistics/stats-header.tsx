"use client";

import { BarChart3 } from "lucide-react";

export function StatsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Statistics & Analytics
        </h1>
        <p className="text-muted-foreground">
          Track your performance metrics and conversion rates.
        </p>
      </div>
    </div>
  );
}
