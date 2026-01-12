"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, MousePointer, Users, DollarSign } from "lucide-react";

interface ChartData {
  date: string;
  clicks: number;
  registrations: number;
  earnings: number;
}

interface PerformanceChartsProps {
  data: ChartData[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PerformanceCharts({ data }: PerformanceChartsProps) {
  const [activeChart, setActiveChart] = useState<"earnings" | "clicks" | "registrations">("earnings");

  const chartConfig = {
    earnings: {
      label: "Earnings",
      color: "#22c55e",
      icon: DollarSign,
      formatter: (value: number) => formatCurrency(value),
    },
    clicks: {
      label: "Clicks",
      color: "#3b82f6",
      icon: MousePointer,
      formatter: (value: number) => value.toLocaleString(),
    },
    registrations: {
      label: "Registrations",
      color: "#8b5cf6",
      icon: Users,
      formatter: (value: number) => value.toLocaleString(),
    },
  };

  const config = chartConfig[activeChart];

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Over Time
          </CardTitle>
          <Tabs
            value={activeChart}
            onValueChange={(v) => setActiveChart(v as typeof activeChart)}
          >
            <TabsList className="bg-muted/50">
              <TabsTrigger value="earnings" className="text-xs">
                Earnings
              </TabsTrigger>
              <TabsTrigger value="clicks" className="text-xs">
                Clicks
              </TabsTrigger>
              <TabsTrigger value="registrations" className="text-xs">
                Regs
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <p className="text-sm text-muted-foreground">Last 30 days performance</p>
      </CardHeader>

      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${activeChart}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  activeChart === "earnings"
                    ? `$${(value / 1000).toFixed(0)}k`
                    : value.toLocaleString()
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value) => [config.formatter(Number(value ?? 0)), config.label]}
                labelFormatter={(label) => formatDate(label)}
              />
              <Area
                type="monotone"
                dataKey={activeChart}
                stroke={config.color}
                strokeWidth={2}
                fill={`url(#gradient-${activeChart})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-bold">
              {config.formatter(data.reduce((sum, d) => sum + d[activeChart], 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Average</p>
            <p className="text-lg font-bold">
              {config.formatter(
                data.length > 0
                  ? data.reduce((sum, d) => sum + d[activeChart], 0) / data.length
                  : 0
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Peak</p>
            <p className="text-lg font-bold">
              {config.formatter(Math.max(...data.map((d) => d[activeChart]), 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
