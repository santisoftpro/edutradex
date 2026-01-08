'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, TrendingUp, TrendingDown, Loader2, Star } from 'lucide-react';
import { cn, isMarketOpen, MarketType } from '@/lib/utils';
import { api, MarketAsset, PriceTick } from '@/lib/api';
import { useChartStore } from '@/store/chart.store';

type AssetCategory = 'all' | 'favorites' | 'forex' | 'crypto' | 'stocks' | 'indices';

interface AssetSelectorProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice?: number | null;
  currentChange?: number | null;
  livePrices?: Map<string, PriceTick>;
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

// Helper function to get MarketType from asset
function getMarketType(asset: MarketAsset): MarketType {
  if (asset.marketType === 'forex') return 'forex';
  if (asset.marketType === 'crypto') return 'crypto';
  if (asset.marketType === 'stock') return 'stock';
  if (asset.marketType === 'index') return 'index';
  return 'forex';
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  all: 'All',
  favorites: 'Favorites',
  forex: 'Forex',
  crypto: 'Crypto',
  stocks: 'Stocks',
  indices: 'Indices',
};

export function AssetSelector({ selectedAsset, onSelectAsset, currentPrice, currentChange, livePrices }: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory>('all');
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marketStatus, setMarketStatus] = useState<Record<MarketType, boolean>>({
    forex: true,
    crypto: true,
    stock: true,
    index: true,
  });

  const { favoritePairs, addFavoritePair, removeFavoritePair } = useChartStore();

  const isFavorite = (symbol: string) => favoritePairs.some((p) => p.symbol === symbol);

  const toggleFavorite = (e: React.MouseEvent, asset: MarketAsset) => {
    e.stopPropagation();
    if (isFavorite(asset.symbol)) {
      removeFavoritePair(asset.symbol);
    } else {
      addFavoritePair({ symbol: asset.symbol, payout: asset.payoutPercent || 98 });
    }
  };

  // Check market status on mount and periodically
  useEffect(() => {
    const checkMarkets = () => {
      setMarketStatus({
        forex: isMarketOpen('forex'),
        crypto: isMarketOpen('crypto'),
        stock: isMarketOpen('stock'),
        index: isMarketOpen('index'),
      });
    };

    checkMarkets();
    // Check every minute
    const interval = setInterval(checkMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

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

      if (category === 'favorites') {
        return matchesSearch && isFavorite(asset.symbol);
      }

      const assetCategory = getAssetCategory(asset);
      const matchesCategory = category === 'all' || assetCategory === category;

      return matchesSearch && matchesCategory;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, search, category, favoritePairs]);

  // Group assets by category for display
  const categoryCounts = useMemo(() => {
    const counts: Record<AssetCategory, number> = {
      all: assets.length,
      favorites: favoritePairs.length,
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
  }, [assets, favoritePairs]);

  // Categories to display (only show those with assets)
  const visibleCategories: AssetCategory[] = (['all', 'favorites', 'forex', 'crypto', 'stocks', 'indices'] as AssetCategory[])
    .filter(cat => cat === 'all' || (cat === 'favorites' ? favoritePairs.length > 0 : categoryCounts[cat] > 0));

  if (isLoading && assets.length === 0) {
    return (
      <div className="flex items-center gap-2.5 h-9 px-3 bg-[#252542]/60 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin text-[#1079ff]" />
        <span className="text-slate-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Selected Asset Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2.5 h-9 px-3 rounded-lg transition-all',
          'bg-[#252542]/60 hover:bg-[#252542]'
        )}
      >
        {/* Asset Icon */}
        <div className="w-7 h-7 rounded-lg bg-[#1079ff]/20 flex items-center justify-center">
          <span className="text-[#1079ff] text-xs font-bold">
            {currentAsset?.symbol?.slice(0, 2) || 'FX'}
          </span>
        </div>
        {/* Symbol */}
        <span className="text-white font-semibold text-sm">{currentAsset?.symbol || selectedAsset}</span>
        {isFavorite(currentAsset?.symbol || selectedAsset) && (
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
        )}
        <ChevronDown
          className={cn('h-4 w-4 text-slate-500 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 md:bg-transparent" onClick={() => setIsOpen(false)} />
          <div className="fixed md:absolute inset-x-2 md:inset-x-auto bottom-2 md:bottom-auto md:top-full md:left-0 md:mt-1.5 md:w-[340px] bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-[#2d2d44]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-9 pr-3 py-2 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#1079ff] transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 p-3 border-b border-[#2d2d44] bg-[#151525]/50">
              {visibleCategories.map((cat) => {
                const isActive = category === cat;
                const isFav = cat === 'favorites';
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                      isActive
                        ? isFav
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-[#1079ff]/20 text-[#1079ff]'
                        : 'bg-[#252542] text-slate-400 hover:text-white hover:bg-[#2d2d52]'
                    )}
                  >
                    {isFav && <Star className={cn('h-3 w-3', isActive && 'fill-yellow-400')} />}
                    {CATEGORY_LABELS[cat]}
                    {cat !== 'all' && (
                      <span className="text-[10px] opacity-60">
                        {categoryCounts[cat]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Asset List */}
            <div className="max-h-[50vh] md:max-h-72 overflow-y-auto custom-scrollbar">
              {filteredAssets.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">
                    {category === 'favorites' ? 'No favorites yet' : 'No assets found'}
                  </p>
                </div>
              ) : (
                <div className="py-1.5">
                  {filteredAssets.map((asset) => {
                    // Get live price data if available
                    const liveData = livePrices?.get(asset.symbol);
                    const price = liveData?.price ?? asset.basePrice;
                    const change = liveData?.changePercent ?? 0;

                    // Check if market is open for this asset
                    const assetMarketType = getMarketType(asset);
                    const isAssetMarketOpen = marketStatus[assetMarketType];
                    const isStarred = isFavorite(asset.symbol);
                    const isSelected = selectedAsset === asset.symbol;

                    return (
                      <div
                        key={asset.symbol}
                        className={cn(
                          'mx-1.5 flex items-center px-2.5 py-2 rounded-lg transition-all',
                          isSelected && 'bg-[#1079ff]/10',
                          !isSelected && isAssetMarketOpen && 'hover:bg-[#252542]',
                          !isAssetMarketOpen && 'opacity-40'
                        )}
                      >
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => toggleFavorite(e, asset)}
                          className="p-1.5 mr-2 hover:bg-[#3d3d5c] rounded-md transition-colors"
                        >
                          <Star
                            className={cn(
                              'h-3.5 w-3.5 transition-colors',
                              isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600 hover:text-yellow-400'
                            )}
                          />
                        </button>

                        {/* Asset Info */}
                        <button
                          onClick={() => {
                            if (isAssetMarketOpen) {
                              onSelectAsset(asset.symbol);
                              setIsOpen(false);
                            }
                          }}
                          disabled={!isAssetMarketOpen}
                          className={cn(
                            'flex-1 flex items-center justify-between gap-3',
                            isAssetMarketOpen ? 'cursor-pointer' : 'cursor-not-allowed'
                          )}
                        >
                          {/* Symbol */}
                          <span className={cn(
                            'font-semibold text-sm',
                            isAssetMarketOpen ? 'text-white' : 'text-slate-500'
                          )}>
                            {asset.symbol}
                          </span>

                          {/* Price & Change */}
                          <div className="text-right flex items-center gap-2.5">
                            {isAssetMarketOpen ? (
                              <>
                                <span className="text-white text-sm font-medium">
                                  ${price.toFixed(price > 100 ? 2 : price < 0.01 ? 6 : 4)}
                                </span>
                                <span className={cn(
                                  'text-xs font-medium',
                                  change >= 0 ? 'text-emerald-400' : 'text-red-400'
                                )}>
                                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-xs text-red-400/70 font-medium">CLOSED</span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
