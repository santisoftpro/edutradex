'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Settings,
  Loader2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '@/store/admin.store';
import { formatCurrency, cn } from '@/lib/utils';
import type { MarketConfig } from '@/types';

function MarketTable({
  title,
  markets,
  emptyMessage,
  onToggleStatus,
  onEdit,
}: {
  title: string;
  markets: MarketConfig[];
  emptyMessage: string;
  onToggleStatus: (market: MarketConfig) => void;
  onEdit: (market: MarketConfig) => void;
}) {
  if (markets.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <span className="text-sm text-slate-400">{markets.length} markets</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Symbol</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Payout</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Min Trade</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Max Trade</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">Volatility</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {markets.map((market) => (
              <tr key={market.id} className="hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="text-white font-medium">{market.symbol}</span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => onToggleStatus(market)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                      market.isActive
                        ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/70'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    )}
                  >
                    {market.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {market.isActive ? 'Active' : 'Disabled'}
                  </button>
                </td>
                <td className="px-6 py-4 text-white">{market.payoutPercent}%</td>
                <td className="px-6 py-4 text-white">{formatCurrency(market.minTradeAmount)}</td>
                <td className="px-6 py-4 text-white">{formatCurrency(market.maxTradeAmount)}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      market.volatilityMode === 'HIGH'
                        ? 'bg-red-900/50 text-red-400'
                        : market.volatilityMode === 'MEDIUM'
                        ? 'bg-amber-900/50 text-amber-400'
                        : 'bg-blue-900/50 text-blue-400'
                    )}
                  >
                    {market.volatilityMode}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onEdit(market)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditMarketModal({
  market,
  onSave,
  onCancel,
}: {
  market: MarketConfig;
  onSave: (config: Partial<Pick<MarketConfig, 'isActive' | 'payoutPercent' | 'minTradeAmount' | 'maxTradeAmount' | 'volatilityMode'>>) => void;
  onCancel: () => void;
}) {
  const [isActive, setIsActive] = useState(market.isActive);
  const [payoutPercent, setPayoutPercent] = useState(market.payoutPercent.toString());
  const [minTradeAmount, setMinTradeAmount] = useState(market.minTradeAmount.toString());
  const [maxTradeAmount, setMaxTradeAmount] = useState(market.maxTradeAmount.toString());
  const [volatilityMode, setVolatilityMode] = useState(market.volatilityMode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payout = parseFloat(payoutPercent);
    const minTrade = parseFloat(minTradeAmount);
    const maxTrade = parseFloat(maxTradeAmount);

    if (payout < 50 || payout > 100) {
      toast.error('Payout must be between 50% and 100%');
      return;
    }
    if (minTrade < 1) {
      toast.error('Minimum trade amount must be at least $1');
      return;
    }
    if (maxTrade < minTrade) {
      toast.error('Maximum trade must be greater than minimum');
      return;
    }

    onSave({
      isActive,
      payoutPercent: payout,
      minTradeAmount: minTrade,
      maxTradeAmount: maxTrade,
      volatilityMode,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">Edit {market.symbol}</h3>
        <p className="text-sm text-slate-400 mt-1">Configure market settings</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-400">Status</label>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                isActive ? 'bg-emerald-600' : 'bg-slate-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  isActive ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Payout Percentage (50-100%)
            </label>
            <input
              type="number"
              value={payoutPercent}
              onChange={(e) => setPayoutPercent(e.target.value)}
              min="50"
              max="100"
              step="1"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Minimum Trade Amount
            </label>
            <input
              type="number"
              value={minTradeAmount}
              onChange={(e) => setMinTradeAmount(e.target.value)}
              min="1"
              step="0.01"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Maximum Trade Amount
            </label>
            <input
              type="number"
              value={maxTradeAmount}
              onChange={(e) => setMaxTradeAmount(e.target.value)}
              min="1"
              step="0.01"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Volatility Mode
            </label>
            <select
              value={volatilityMode}
              onChange={(e) => setVolatilityMode(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg font-medium transition-all"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const {
    marketConfigs,
    isLoading,
    error,
    fetchMarketConfigs,
    updateMarketConfig,
    initializeMarketConfigs,
    clearError,
  } = useAdminStore();

  const [editingMarket, setEditingMarket] = useState<MarketConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    fetchMarketConfigs();
  }, [fetchMarketConfigs]);

  const handleSaveMarket = async (
    config: Partial<Pick<MarketConfig, 'isActive' | 'payoutPercent' | 'minTradeAmount' | 'maxTradeAmount' | 'volatilityMode'>>
  ) => {
    if (!editingMarket) return;
    try {
      await updateMarketConfig(editingMarket.symbol, config);
      toast.success('Market configuration updated');
      setEditingMarket(null);
    } catch {
      toast.error('Failed to update market configuration');
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeMarketConfigs();
      toast.success('Market configurations initialized');
    } catch {
      toast.error('Failed to initialize market configurations');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleToggleStatus = async (market: MarketConfig) => {
    try {
      await updateMarketConfig(market.symbol, { isActive: !market.isActive });
      toast.success(`${market.symbol} ${market.isActive ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update market status');
    }
  };

  // Categorize markets by symbol patterns
  const cryptoSymbols = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BNB', 'SOL', 'DOGE', 'ADA', 'DOT'];
  const commoditySymbols = ['XAU', 'XAG', 'XPT', 'XPD', 'WTI', 'BRENT', 'NGAS'];
  const indexSymbols = ['US500', 'US100', 'US30', 'UK100', 'DE40', 'JP225', 'HK50', 'AU200'];

  const isCrypto = (symbol: string) => cryptoSymbols.some(s => symbol.startsWith(s));
  const isCommodity = (symbol: string) => commoditySymbols.some(s => symbol.startsWith(s));
  const isIndex = (symbol: string) => indexSymbols.some(s => symbol.startsWith(s));
  const isOtc = (symbol: string) => symbol.startsWith('OTC_') || symbol.startsWith('VOL_') ||
    symbol.startsWith('CRASH_') || symbol.startsWith('BOOM_') || symbol.startsWith('STEP') ||
    symbol.startsWith('JUMP_') || symbol.startsWith('RANGE_') || symbol.startsWith('DRIFT_');

  const cryptoMarkets = marketConfigs.filter((m) => isCrypto(m.symbol));
  const commodityMarkets = marketConfigs.filter((m) => isCommodity(m.symbol));
  const indexMarkets = marketConfigs.filter((m) => isIndex(m.symbol));
  const otcMarkets = marketConfigs.filter((m) => m.marketType === 'otc' || isOtc(m.symbol));
  const forexMarkets = marketConfigs.filter((m) =>
    m.marketType === 'forex' &&
    !isCrypto(m.symbol) &&
    !isCommodity(m.symbol) &&
    !isIndex(m.symbol) &&
    !isOtc(m.symbol)
  );

  if (isLoading && marketConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (error && marketConfigs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchMarketConfigs();
            }}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Configuration</h1>
          <p className="text-slate-400 mt-1">Configure trading markets and their parameters</p>
        </div>
        <button
          onClick={handleInitialize}
          disabled={isInitializing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isInitializing && 'animate-spin')} />
          Initialize All Markets
        </button>
      </div>

      {marketConfigs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <TrendingUp className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="mt-4 text-slate-400">No market configurations found</p>
          <p className="text-sm text-slate-500 mt-1">
            Click &quot;Initialize All Markets&quot; to create default configurations
          </p>
        </div>
      ) : (
        <>
          <MarketTable
            title="Forex Markets"
            markets={forexMarkets}
            emptyMessage="No forex markets configured"
            onToggleStatus={handleToggleStatus}
            onEdit={setEditingMarket}
          />

          <MarketTable
            title="Crypto Markets"
            markets={cryptoMarkets}
            emptyMessage="No crypto markets configured"
            onToggleStatus={handleToggleStatus}
            onEdit={setEditingMarket}
          />

          <MarketTable
            title="Commodities"
            markets={commodityMarkets}
            emptyMessage="No commodity markets configured"
            onToggleStatus={handleToggleStatus}
            onEdit={setEditingMarket}
          />

          <MarketTable
            title="Stock Indices"
            markets={indexMarkets}
            emptyMessage="No index markets configured"
            onToggleStatus={handleToggleStatus}
            onEdit={setEditingMarket}
          />

          <MarketTable
            title="OTC & Synthetic Markets"
            markets={otcMarkets}
            emptyMessage="No OTC/synthetic markets configured"
            onToggleStatus={handleToggleStatus}
            onEdit={setEditingMarket}
          />
        </>
      )}

      {editingMarket && (
        <EditMarketModal
          market={editingMarket}
          onSave={handleSaveMarket}
          onCancel={() => setEditingMarket(null)}
        />
      )}
    </div>
  );
}
