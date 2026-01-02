'use client';

import { useEffect, useState } from 'react';
import {
  Percent,
  Loader2,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  Save,
  Edit2,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SpreadConfig, UpdateSpreadConfigInput, MarketStatus } from '@/types';

export default function SpreadsPage() {
  const [spreads, setSpreads] = useState<SpreadConfig[]>([]);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    markupPips: string;
    description: string;
  }>({ markupPips: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [spreadsData, statusData] = await Promise.all([
        api.getAllSpreadConfigs(),
        api.getMarketStatus(),
      ]);
      setSpreads(spreadsData);
      setMarketStatus(statusData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      toast.error('Failed to load spread configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await api.reloadSpreadConfigs();
      toast.success('Spread configurations reloaded in market service');
      await fetchData();
    } catch {
      toast.error('Failed to reload spread configurations');
    } finally {
      setIsReloading(false);
    }
  };

  const handleToggleActive = async (spread: SpreadConfig) => {
    try {
      const updated = await api.updateSpreadConfig(spread.symbol, {
        isActive: !spread.isActive,
      });
      setSpreads(spreads.map((s) => (s.symbol === spread.symbol ? updated : s)));
      toast.success(`${spread.symbol} ${spread.isActive ? 'disabled' : 'enabled'}`);
    } catch {
      toast.error('Failed to update spread status');
    }
  };

  const handleEdit = (spread: SpreadConfig) => {
    setEditingSymbol(spread.symbol);
    setEditValues({
      markupPips: spread.markupPips.toString(),
      description: spread.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingSymbol(null);
    setEditValues({ markupPips: '', description: '' });
  };

  const handleSave = async (symbol: string) => {
    const markupPips = parseFloat(editValues.markupPips);

    if (isNaN(markupPips)) {
      toast.error('Invalid markup value');
      return;
    }

    if (markupPips < 0.5 || markupPips > 10) {
      toast.error('Markup must be between 0.5 and 10 pips');
      return;
    }

    try {
      const updateData: UpdateSpreadConfigInput = {
        markupPips,
      };

      if (editValues.description.trim()) {
        updateData.description = editValues.description.trim();
      }

      const updated = await api.updateSpreadConfig(symbol, updateData);
      setSpreads(spreads.map((s) => (s.symbol === symbol ? updated : s)));
      toast.success('Spread configuration updated');
      handleCancelEdit();
    } catch {
      toast.error('Failed to update spread configuration');
    }
  };

  const forexSpreads = spreads.filter(
    (s) => !s.symbol.startsWith('OTC_') && !s.symbol.startsWith('VOL_')
  );
  const otcSpreads = spreads.filter((s) => s.symbol.startsWith('OTC_'));
  const volatilitySpreads = spreads.filter((s) => s.symbol.startsWith('VOL_'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (error && spreads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const renderSpreadRow = (spread: SpreadConfig) => {
    const isEditing = editingSymbol === spread.symbol;

    return (
      <tr key={spread.id} className="hover:bg-slate-700/50 transition-colors">
        <td className="px-6 py-4">
          <span className="text-white font-medium">{spread.symbol}</span>
        </td>
        <td className="px-6 py-4">
          {isEditing ? (
            <input
              type="number"
              value={editValues.markupPips}
              onChange={(e) => setEditValues({ ...editValues, markupPips: e.target.value })}
              min="0.5"
              max="10"
              step="0.1"
              className="w-24 px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
              autoFocus
            />
          ) : (
            <span className="text-white font-mono">{spread.markupPips.toFixed(1)}</span>
          )}
        </td>
        <td className="px-6 py-4">
          {isEditing ? (
            <input
              type="text"
              value={editValues.description}
              onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
            />
          ) : (
            <span className="text-slate-400 text-sm">{spread.description || '—'}</span>
          )}
        </td>
        <td className="px-6 py-4">
          <button
            onClick={() => handleToggleActive(spread)}
            disabled={isEditing}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
              spread.isActive
                ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/70'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600',
              isEditing && 'opacity-50 cursor-not-allowed'
            )}
          >
            {spread.isActive ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {spread.isActive ? 'Active' : 'Disabled'}
          </button>
        </td>
        <td className="px-6 py-4 text-right">
          {isEditing ? (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleSave(spread.symbol)}
                className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700 rounded-lg transition-colors"
                title="Save changes"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleEdit(spread)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Edit spread"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Spread Management</h1>
          <p className="text-slate-400 mt-1">Configure broker markup spreads for all symbols</p>
        </div>
        <button
          onClick={handleReload}
          disabled={isReloading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', isReloading && 'animate-spin')} />
          Reload Configs
        </button>
      </div>

      {marketStatus && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-[#1079ff]" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-white">Market Status</h3>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                <span>
                  Deriv API:{' '}
                  <span
                    className={cn(
                      'font-medium',
                      marketStatus.derivConnected ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {marketStatus.derivConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </span>
                <span>
                  Mode:{' '}
                  <span className="font-medium text-slate-300">
                    {marketStatus.usingSimulation ? 'Simulation' : 'Real Data'}
                  </span>
                </span>
                <span>
                  Spreads Loaded:{' '}
                  <span className="font-medium text-slate-300">
                    {marketStatus.spreadConfigsLoaded}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {spreads.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <Percent className="h-12 w-12 text-slate-500 mx-auto" />
          <p className="mt-4 text-slate-400">No spread configurations found</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Forex Pairs</h2>
              <p className="text-sm text-slate-400 mt-1">Major currency pairs</p>
            </div>
            {forexSpreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No forex spreads configured</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Markup (pips)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {forexSpreads.map(renderSpreadRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">OTC Pairs</h2>
              <p className="text-sm text-slate-400 mt-1">Over-the-counter markets</p>
            </div>
            {otcSpreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No OTC spreads configured</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Markup (pips)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {otcSpreads.map(renderSpreadRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Volatility Indices</h2>
              <p className="text-sm text-slate-400 mt-1">Synthetic volatility instruments</p>
            </div>
            {volatilitySpreads.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No volatility spreads configured
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Markup (pips)
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-400">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-medium text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {volatilitySpreads.map(renderSpreadRow)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-400 mb-2">About Spread Markup</h3>
        <p className="text-xs text-blue-300/80 leading-relaxed">
          Spread markup is applied to widen the bid-ask spread, representing broker profit. For
          example, if Deriv sends bid=1.0850, ask=1.0852 and markup is 2 pips (0.0002), the final
          prices become bid=1.0848, ask=1.0854. Markup must be between 0.5 and 10 pips. Click
          &quot;Reload Configs&quot; after making changes to apply them to the market service.
        </p>
      </div>
    </div>
  );
}
