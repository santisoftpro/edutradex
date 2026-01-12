'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  PieChartIcon,
  Calendar,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { api, RevenueByMarketResult, SymbolRevenue } from '@/lib/api';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

const MARKET_COLORS: Record<string, string> = {
  FOREX: '#3b82f6',
  CRYPTO: '#f59e0b',
  STOCK: '#10b981',
  INDEX: '#8b5cf6',
  OTC: '#ec4899',
};

const CHART_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];

type DateRange = '7d' | '30d' | '90d' | 'mtd' | 'last_month';

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
  }
}

// Market Revenue Table Component
function MarketRevenueTable({ data }: { data: RevenueByMarketResult }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Revenue by Market
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Market</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Volume</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Trades</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Win Rate</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Margin</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">% Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.markets.map((market) => (
              <tr key={market.market} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: MARKET_COLORS[market.market] || '#64748b' }}
                    />
                    <span className="font-medium text-white">{market.market}</span>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span className={cn(
                    "font-medium",
                    market.netRevenue >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatCurrency(market.netRevenue)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-slate-300">
                  {formatCurrency(market.totalVolume)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-slate-300">
                  {market.totalTrades.toLocaleString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span className={cn(
                    "font-medium",
                    market.brokerWinRate >= 50 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatPercent(market.brokerWinRate)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <span className={cn(
                    "font-medium",
                    market.profitMargin >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {formatPercent(market.profitMargin)}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${market.percentOfTotal}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-sm w-12 text-right">
                      {formatPercent(market.percentOfTotal)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900">
            <tr>
              <td className="px-4 py-3 font-semibold text-white">Total</td>
              <td className="px-4 py-3 text-right font-semibold text-green-400">
                {formatCurrency(data.totals.totalRevenue)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-white">
                {formatCurrency(data.totals.totalVolume)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-white">
                {data.totals.totalTrades.toLocaleString()}
              </td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// Top Symbols Table Component
function TopSymbolsTable({ symbols }: { symbols: SymbolRevenue[] }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-400" />
          Top Symbols by Revenue
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Symbol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Market</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Volume</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Trades</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">% Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {symbols.map((symbol, index) => (
              <tr key={symbol.symbol} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap text-slate-400">{index + 1}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="font-medium text-white">{symbol.symbol}</span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: `${MARKET_COLORS[symbol.market] || '#64748b'}20`,
                      color: MARKET_COLORS[symbol.market] || '#64748b',
                    }}
                  >
                    {symbol.market}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right font-medium text-green-400">
                  {formatCurrency(symbol.grossRevenue)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-slate-300">
                  {formatCurrency(symbol.totalVolume)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-slate-300">
                  {symbol.totalTrades.toLocaleString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-slate-400">
                  {formatPercent(symbol.percentOfTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RevenueBreakdownPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const { from, to } = getDateRange(dateRange);

  const { data: marketData, isLoading: marketsLoading, refetch: refetchMarkets } = useQuery({
    queryKey: ['revenue-by-market', from, to],
    queryFn: () => api.getRevenueByMarket(from, to),
  });

  const { data: symbolData, isLoading: symbolsLoading, refetch: refetchSymbols } = useQuery({
    queryKey: ['revenue-by-symbol', from, to],
    queryFn: () => api.getRevenueBySymbol(from, to, 10),
  });

  const isLoading = marketsLoading || symbolsLoading;

  const handleRefresh = () => {
    refetchMarkets();
    refetchSymbols();
  };

  const pieChartData = marketData?.markets.map((m) => ({
    name: m.market,
    value: m.netRevenue,
    color: MARKET_COLORS[m.market] || '#64748b',
  })) || [];

  const barChartData = symbolData?.map((s) => ({
    name: s.symbol.length > 10 ? s.symbol.substring(0, 10) + '...' : s.symbol,
    revenue: s.grossRevenue,
    volume: s.totalVolume,
  })) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-800 rounded w-64" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-slate-800 rounded-lg" />
              <div className="h-80 bg-slate-800 rounded-lg" />
            </div>
            <div className="h-96 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Revenue Breakdown</h1>
            <p className="text-slate-400">
              Revenue analysis by market type and symbol
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {(['7d', '30d', '90d', 'mtd', 'last_month'] as DateRange[]).map((range) => (
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
                  {range === 'mtd' ? 'MTD' : range === 'last_month' ? 'Last Month' : range.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {marketData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(marketData.totals.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Volume</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCurrency(marketData.totals.totalVolume)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Trades</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {marketData.totals.totalTrades.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pie Chart */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <PieChartIcon className="h-5 w-5 text-pink-400" />
              Revenue Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              Top Symbols Revenue
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                    stroke="#64748b"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tables */}
        <div className="space-y-6">
          {marketData && <MarketRevenueTable data={marketData} />}
          {symbolData && symbolData.length > 0 && <TopSymbolsTable symbols={symbolData} />}
        </div>

        {/* Date Range Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            <Calendar className="h-3 w-3 inline mr-1" />
            Showing data from {format(new Date(from), 'PPP')} to {format(new Date(to), 'PPP')}
          </p>
        </div>
      </div>
    </div>
  );
}
