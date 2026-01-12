'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  Minus,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';
import { api, PLStatement } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return value < 0 ? `(${formatted})` : formatted;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

type DateRange = '7d' | '30d' | '90d' | 'mtd' | 'last_month' | 'ytd';

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  switch (range) {
    case '7d':
      return { from: format(subDays(now, 7), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '30d':
      return { from: format(subDays(now, 30), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case '90d':
      return { from: format(subDays(now, 90), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'mtd':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        to: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    case 'ytd':
      return { from: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'), to: format(now, 'yyyy-MM-dd') };
  }
}

// P&L Line Item Component
function LineItem({
  label,
  value,
  indent = 0,
  bold = false,
  isTotal = false,
  isSubtotal = false,
  showSign = false,
}: {
  label: string;
  value: number;
  indent?: number;
  bold?: boolean;
  isTotal?: boolean;
  isSubtotal?: boolean;
  showSign?: boolean;
}) {
  const isNegative = value < 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-4",
        isTotal && "bg-slate-700/50 border-t-2 border-b-2 border-slate-600",
        isSubtotal && "bg-slate-800/50 border-t border-slate-700",
        !isTotal && !isSubtotal && "hover:bg-slate-800/30"
      )}
    >
      <span
        className={cn(
          "text-slate-300",
          bold && "font-semibold text-white",
          isTotal && "font-bold text-white uppercase"
        )}
        style={{ paddingLeft: `${indent * 1.5}rem` }}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-mono",
          bold && "font-semibold",
          isTotal && "font-bold text-lg",
          isNegative ? "text-red-400" : "text-slate-300",
          value > 0 && !isNegative && showSign && "text-green-400"
        )}
      >
        {showSign && value > 0 && '+'}
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// Section Header Component
function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-slate-700 border-y border-slate-600">
      <Icon className="h-4 w-4 text-blue-400" />
      <span className="font-semibold text-white uppercase text-sm tracking-wide">{title}</span>
    </div>
  );
}

export default function PLStatementPage() {
  const [dateRange, setDateRange] = useState<DateRange>('mtd');
  const { from, to } = getDateRange(dateRange);

  const { data: plData, isLoading, refetch } = useQuery({
    queryKey: ['pl-statement', from, to],
    queryFn: () => api.getPLStatement(from, to),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="h-[600px] bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!plData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Profit & Loss Statement</h1>
            <p className="text-slate-400">
              {format(new Date(from), 'MMMM d, yyyy')} - {format(new Date(to), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {(['7d', '30d', '90d', 'mtd', 'last_month', 'ytd'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors",
                    dateRange === range
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  )}
                >
                  {range === 'mtd' ? 'MTD' : range === 'last_month' ? 'Last Mo' : range === 'ytd' ? 'YTD' : range.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Total Income</p>
            <p className="text-xl font-bold text-green-400">{formatCurrency(plData.income.totalIncome)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Total Expenses</p>
            <p className="text-xl font-bold text-red-400">{formatCurrency(plData.expenses.totalExpenses)}</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Net Profit</p>
            <p className={cn(
              "text-xl font-bold",
              plData.summary.netProfit >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {formatCurrency(plData.summary.netProfit)}
            </p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Profit Margin</p>
            <p className={cn(
              "text-xl font-bold",
              plData.summary.profitMargin >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {formatPercent(plData.summary.profitMargin)}
            </p>
          </div>
        </div>

        {/* Period Comparison */}
        {plData.comparison && (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400">vs Previous Period</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Profit Change</p>
                  <p className={cn(
                    "font-semibold flex items-center gap-1",
                    plData.comparison.change.amount >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {plData.comparison.change.amount >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {formatCurrency(plData.comparison.change.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">% Change</p>
                  <p className={cn(
                    "font-semibold",
                    plData.comparison.change.percent >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {plData.comparison.change.percent >= 0 ? '+' : ''}
                    {formatPercent(plData.comparison.change.percent)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* P&L Statement */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-700 px-4 py-3 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <h2 className="font-bold text-white uppercase text-sm tracking-wide">
                Statement of Profit and Loss
              </h2>
            </div>
          </div>

          {/* Income Section */}
          <SectionHeader title="Income" icon={TrendingUp} />
          <div className="divide-y divide-slate-700/50">
            <LineItem label="Trading Revenue" value={0} bold indent={0} />
            <LineItem
              label="Gross Trade Amount"
              value={plData.income.tradingRevenue.grossTradeAmount}
              indent={1}
            />
            <LineItem
              label="Less: Payouts Paid"
              value={-plData.income.tradingRevenue.payoutsPaid}
              indent={1}
            />
            <LineItem
              label="Net Trading Revenue"
              value={plData.income.tradingRevenue.netTradingRevenue}
              isSubtotal
              bold
              indent={1}
            />
            <LineItem
              label="Other Income"
              value={plData.income.otherIncome}
              indent={0}
            />
            <LineItem
              label="Total Income"
              value={plData.income.totalIncome}
              isTotal
            />
          </div>

          {/* Expenses Section */}
          <SectionHeader title="Expenses" icon={TrendingDown} />
          <div className="divide-y divide-slate-700/50">
            <LineItem label="Affiliate Costs" value={0} bold indent={0} />
            <LineItem
              label="Signup Bonuses"
              value={plData.expenses.affiliateCosts.signupBonuses}
              indent={1}
            />
            <LineItem
              label="Deposit Commissions"
              value={plData.expenses.affiliateCosts.depositCommissions}
              indent={1}
            />
            <LineItem
              label="Trade Commissions"
              value={plData.expenses.affiliateCosts.tradeCommissions}
              indent={1}
            />
            <LineItem
              label="Total Affiliate Costs"
              value={plData.expenses.affiliateCosts.totalAffiliateCosts}
              isSubtotal
              bold
              indent={1}
            />

            <LineItem label="Operating Expenses" value={0} bold indent={0} />
            {plData.expenses.operatingExpenses.byCategory.map((cat) => (
              <LineItem
                key={cat.category}
                label={cat.category}
                value={cat.amount}
                indent={1}
              />
            ))}
            <LineItem
              label="Total Operating Expenses"
              value={plData.expenses.operatingExpenses.totalOperating}
              isSubtotal
              bold
              indent={1}
            />

            <LineItem
              label="Total Expenses"
              value={plData.expenses.totalExpenses}
              isTotal
            />
          </div>

          {/* Summary Section */}
          <SectionHeader title="Summary" icon={DollarSign} />
          <div className="divide-y divide-slate-700/50">
            <LineItem
              label="Gross Profit"
              value={plData.summary.grossProfit}
              bold
            />
            <LineItem
              label="Operating Profit"
              value={plData.summary.operatingProfit}
              bold
            />
            <LineItem
              label="Net Profit"
              value={plData.summary.netProfit}
              isTotal
            />
          </div>

          {/* Profit Margin Footer */}
          <div className="bg-slate-700/50 px-4 py-3 border-t border-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Profit Margin</span>
              <span className={cn(
                "font-bold text-lg",
                plData.summary.profitMargin >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {formatPercent(plData.summary.profitMargin)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Generated on {format(new Date(), 'PPPpp')}
          </p>
        </div>
      </div>
    </div>
  );
}
