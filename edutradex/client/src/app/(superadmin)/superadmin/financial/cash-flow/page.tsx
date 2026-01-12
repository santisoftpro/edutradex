'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  Activity,
} from 'lucide-react';
import { api, CashFlowResult } from '@/lib/api';
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

// Cash Flow Line Item
function CashFlowItem({
  label,
  value,
  indent = 0,
  isTotal = false,
  isNetChange = false,
}: {
  label: string;
  value: number;
  indent?: number;
  isTotal?: boolean;
  isNetChange?: boolean;
}) {
  const isNegative = value < 0;
  const isPositive = value > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 px-4",
        isTotal && "bg-slate-700/50 border-t border-slate-600",
        isNetChange && "bg-blue-500/10 border-t-2 border-blue-500"
      )}
    >
      <div className="flex items-center gap-2">
        {!isTotal && !isNetChange && (
          isNegative ? (
            <ArrowDownCircle className="h-4 w-4 text-red-400" />
          ) : (
            <ArrowUpCircle className="h-4 w-4 text-green-400" />
          )
        )}
        <span
          className={cn(
            "text-slate-300",
            isTotal && "font-semibold text-white",
            isNetChange && "font-bold text-white"
          )}
          style={{ paddingLeft: `${indent * 1.5}rem` }}
        >
          {label}
        </span>
      </div>
      <span
        className={cn(
          "font-mono",
          isTotal && "font-semibold text-lg",
          isNetChange && "font-bold text-xl",
          isNegative ? "text-red-400" : isPositive ? "text-green-400" : "text-slate-300"
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// Section Component
function CashFlowSection({
  title,
  icon: Icon,
  iconColor,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-700 last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-700">
        <Icon className={cn("h-5 w-5", iconColor)} />
        <span className="font-semibold text-white uppercase text-sm tracking-wide">{title}</span>
      </div>
      <div className="divide-y divide-slate-700/50">{children}</div>
    </div>
  );
}

export default function CashFlowPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: cashFlowData, isLoading, refetch } = useQuery({
    queryKey: ['cash-flow', month, year],
    queryFn: () => api.getCashFlowStatement(month, year),
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

  if (!cashFlowData) {
    return null;
  }

  const monthName = format(new Date(year, month - 1, 1), 'MMMM yyyy');

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Cash Flow Statement</h1>
            <p className="text-slate-400">
              Cash inflows and outflows for {monthName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {format(new Date(2024, i, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 border border-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Opening Balance</p>
                <p className="text-xl font-bold text-blue-400">
                  {formatCurrency(cashFlowData.summary.openingBalance)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-lg",
                cashFlowData.summary.netCashChange >= 0 ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                {cashFlowData.summary.netCashChange >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-400" />
                )}
              </div>
              <div>
                <p className="text-sm text-slate-400">Net Change</p>
                <p className={cn(
                  "text-xl font-bold",
                  cashFlowData.summary.netCashChange >= 0 ? "text-green-400" : "text-red-400"
                )}>
                  {formatCurrency(cashFlowData.summary.netCashChange)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Closing Balance</p>
                <p className="text-xl font-bold text-purple-400">
                  {formatCurrency(cashFlowData.summary.closingBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow Statement */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-slate-700 px-4 py-3 border-b border-slate-600">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-400" />
              <h2 className="font-bold text-white uppercase text-sm tracking-wide">
                Statement of Cash Flows
              </h2>
            </div>
          </div>

          {/* Operating Activities */}
          <CashFlowSection title="Operating Activities" icon={Activity} iconColor="text-green-400">
            <CashFlowItem
              label="Trading Revenue"
              value={cashFlowData.operatingActivities.tradingRevenue}
            />
            <CashFlowItem
              label="Trading Payouts"
              value={-cashFlowData.operatingActivities.tradingPayouts}
            />
            <CashFlowItem
              label="Net Trading Cash"
              value={cashFlowData.operatingActivities.netTradingCash}
              isTotal
            />
            <CashFlowItem
              label="Affiliate Commissions"
              value={-cashFlowData.operatingActivities.affiliateCommissions}
            />
            <CashFlowItem
              label="Operating Expenses"
              value={-cashFlowData.operatingActivities.operatingExpenses}
            />
            <CashFlowItem
              label="Net Cash from Operating Activities"
              value={cashFlowData.operatingActivities.netOperatingCash}
              isTotal
            />
          </CashFlowSection>

          {/* Financing Activities */}
          <CashFlowSection title="Financing Activities" icon={DollarSign} iconColor="text-blue-400">
            <CashFlowItem
              label="Customer Deposits"
              value={cashFlowData.financingActivities.customerDeposits}
            />
            <CashFlowItem
              label="Customer Withdrawals"
              value={-cashFlowData.financingActivities.customerWithdrawals}
            />
            <CashFlowItem
              label="Net Cash from Financing Activities"
              value={cashFlowData.financingActivities.netFinancingCash}
              isTotal
            />
          </CashFlowSection>

          {/* Summary */}
          <CashFlowSection title="Summary" icon={Wallet} iconColor="text-purple-400">
            <CashFlowItem
              label="Opening Cash Balance"
              value={cashFlowData.summary.openingBalance}
            />
            <CashFlowItem
              label="Net Change in Cash"
              value={cashFlowData.summary.netCashChange}
              isNetChange
            />
            <CashFlowItem
              label="Closing Cash Balance"
              value={cashFlowData.summary.closingBalance}
              isTotal
            />
          </CashFlowSection>
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
