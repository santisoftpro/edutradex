"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PerformanceDataPoint {
  date: string;
  registrations: number;
  ftdCount: number;
  deposits: number;
  commissions: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
}

type MetricKey = "registrations" | "ftdCount" | "deposits" | "commissions";

const metrics: { key: MetricKey; label: string; color: string }[] = [
  { key: "registrations", label: "Registrations", color: "#3b82f6" },
  { key: "ftdCount", label: "FTDs", color: "#22c55e" },
  { key: "commissions", label: "Commissions", color: "#a855f7" },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatValue(value: number, metric: MetricKey): string {
  if (metric === "commissions" || metric === "deposits") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toString();
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("commissions");

  const currentMetric = metrics.find((m) => m.key === selectedMetric)!;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold">Performance Overview</CardTitle>
          <div className="flex gap-1">
            {metrics.map((metric) => (
              <Button
                key={metric.key}
                variant={selectedMetric === metric.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedMetric(metric.key)}
                className={cn(
                  "text-xs",
                  selectedMetric === metric.key && "bg-primary"
                )}
              >
                {metric.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={currentMetric.color}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={currentMetric.color}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(value) => formatValue(value, selectedMetric)}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  labelStyle={{ color: "#f8fafc" }}
                  itemStyle={{ color: currentMetric.color }}
                  formatter={(value) => [
                    formatValue(Number(value ?? 0), selectedMetric),
                    currentMetric.label,
                  ]}
                  labelFormatter={formatDate}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={currentMetric.color}
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
