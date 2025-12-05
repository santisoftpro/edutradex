'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api, MarketAsset } from '@/lib/api';

type AssetCategory = 'all' | 'forex' | 'crypto' | 'stocks' | 'indices';

interface AssetSelectorProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice?: number | null;
  currentChange?: number | null;
}

// Helper function to determine asset category from marketType
function getAssetCategory(asset: MarketAsset): AssetCategory {
  if (asset.marketType === 'forex') {
    return 'forex';
  }
  if (asset.marketType === 'crypto') {
    return 'crypto';
  }
  if (asset.marketType === 'stock') {
    return 'stocks';
  }
  if (asset.marketType === 'index') {
    return 'indices';
  }
  // Default based on symbol patterns for backwards compatibility
  return 'forex';
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  all: 'All',
  forex: 'Forex',
  crypto: 'Crypto',
  stocks: 'Stocks',
  indices: 'Indices',
};

export function AssetSelector({ selectedAsset, onSelectAsset, currentPrice, currentChange }: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory>('all');
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch assets on mount
  useEffect(() => {
    async function fetchAssets() {
      try {
        setIsLoading(true);
        const allAssets = await api.getAllAssets();
        setAssets(allAssets);
      } catch (error) {
        console.error('Failed to fetch assets:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, []);

  // Find current asset
  const currentAsset = useMemo(() => {
    return assets.find((a) => a.symbol === selectedAsset) || assets[0];
  }, [assets, selectedAsset]);

  // Use real-time price if available, otherwise fallback to base price
  const displayPrice = currentPrice ?? currentAsset?.basePrice ?? 0;
  const displayChange = currentChange ?? 0;

  // Filter assets based on search and category
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
        asset.name.toLowerCase().includes(search.toLowerCase());

      const assetCategory = getAssetCategory(asset);
      const matchesCategory = category === 'all' || assetCategory === category;

      return matchesSearch && matchesCategory;
    });
  }, [assets, search, category]);

  // Group assets by category for display
  const categoryCounts = useMemo(() => {
    const counts: Record<AssetCategory, number> = {
      all: assets.length,
      forex: 0,
      crypto: 0,
      stocks: 0,
      indices: 0,
    };

    assets.forEach((asset) => {
      const cat = getAssetCategory(asset);
      counts[cat]++;
    });

    return counts;
  }, [assets]);

  // Categories to display (only show those with assets)
  const visibleCategories: AssetCategory[] = (['all', 'forex', 'crypto', 'stocks', 'indices'] as AssetCategory[])
    .filter(cat => cat === 'all' || categoryCounts[cat] > 0);

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-[#252542] rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-gray-400 text-sm">Loading assets...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Asset Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-[#252542] hover:bg-[#2d2d52] rounded-lg transition-colors"
      >
        <div className="text-left">
          <div className="text-white font-semibold text-sm md:text-base">{currentAsset?.symbol || selectedAsset}</div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-gray-400 text-sm">${displayPrice.toFixed(displayPrice > 100 ? 2 : 5)}</span>
            <span
              className={cn(
                'text-xs font-medium flex items-center gap-0.5',
                displayChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {displayChange >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {displayChange >= 0 ? '+' : ''}
              {displayChange.toFixed(2)}%
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 md:h-5 md:w-5 text-gray-400 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:bg-transparent" onClick={() => setIsOpen(false)} />
          <div className="fixed md:absolute inset-x-2 md:inset-x-auto bottom-2 md:bottom-auto md:top-full md:left-0 md:mt-2 md:w-96 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl z-50">
            {/* Search */}
            <div className="p-3 border-b border-[#2d2d44]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-9 pr-4 py-2 bg-[#252542] border border-[#3d3d5c] rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1 p-2 border-b border-[#2d2d44]">
              {visibleCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-colors',
                    category === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#252542] text-gray-400 hover:text-white'
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                  {cat !== 'all' && (
                    <span className="ml-1 opacity-60">({categoryCounts[cat]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Asset List */}
            <div className="max-h-[50vh] md:max-h-80 overflow-y-auto">
              {filteredAssets.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No assets found
                </div>
              ) : (
                filteredAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      onSelectAsset(asset.symbol);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 hover:bg-[#252542] transition-colors',
                      selectedAsset === asset.symbol && 'bg-[#252542]'
                    )}
                  >
                    <div className="text-left">
                      <div className="text-white font-medium">{asset.symbol}</div>
                      <div className="text-gray-500 text-xs truncate max-w-[180px]">{asset.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm">
                        ${asset.basePrice.toFixed(asset.basePrice > 100 ? 2 : asset.basePrice < 0.01 ? 8 : 4)}
                      </div>
                      <div className="text-xs text-emerald-400">
                        {asset.payoutPercent}% payout
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
