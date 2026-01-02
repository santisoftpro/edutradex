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
                  className="w-full pl-9 pr-4 py-2 bg-[#252542] border border-[#3d3d5c] rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#1079ff]"
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
                    'px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1',
                    category === cat
                      ? cat === 'favorites' ? 'bg-yellow-600 text-white' : 'bg-[#1079ff] text-white'
                      : 'bg-[#252542] text-gray-400 hover:text-white'
                  )}
                >
                  {cat === 'favorites' && <Star className="h-3 w-3" />}
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
                  {category === 'favorites' ? 'No favorites yet. Star an asset to add it!' : 'No assets found'}
                </div>
              ) : (
                filteredAssets.map((asset) => {
                  // Get live price data if available
                  const liveData = livePrices?.get(asset.symbol);
                  const price = liveData?.price ?? asset.basePrice;
                  const change = liveData?.changePercent ?? 0;

                  // Check if market is open for this asset
                  const assetMarketType = getMarketType(asset);
                  const isAssetMarketOpen = marketStatus[assetMarketType];
                  const isStarred = isFavorite(asset.symbol);

                  return (
                    <div
                      key={asset.symbol}
                      className={cn(
                        'w-full flex items-center px-4 py-3 transition-colors',
                        selectedAsset === asset.symbol && 'bg-[#252542]',
                        isAssetMarketOpen
                          ? 'hover:bg-[#252542]'
                          : 'opacity-50 bg-[#151525]'
                      )}
                    >
                      <button
                        onClick={(e) => toggleFavorite(e, asset)}
                        className="p-1 -ml-1 mr-2 hover:bg-[#3d3d5c] rounded transition-colors"
                      >
                        <Star
                          className={cn(
                            'h-4 w-4 transition-colors',
                            isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500 hover:text-yellow-400'
                          )}
                        />
                      </button>
                      <button
                        onClick={() => {
                          if (isAssetMarketOpen) {
                            onSelectAsset(asset.symbol);
                            setIsOpen(false);
                          }
                        }}
                        disabled={!isAssetMarketOpen}
                        className={cn(
                          'flex-1 flex items-center justify-between',
                          isAssetMarketOpen ? 'cursor-pointer' : 'cursor-not-allowed'
                        )}
                      >
                        <div className="text-left">
                          <div className={cn(
                            'font-medium',
                            isAssetMarketOpen ? 'text-white' : 'text-gray-500'
                          )}>
                            {asset.symbol}
                          </div>
                          <div className="text-gray-500 text-xs truncate max-w-[180px]">
                            {isAssetMarketOpen ? asset.name : 'Market Closed'}
                          </div>
                        </div>
                        <div className="text-right">
                          {isAssetMarketOpen ? (
                            <>
                              <div className="text-white text-sm">
                                ${price.toFixed(price > 100 ? 2 : price < 0.01 ? 8 : 4)}
                              </div>
                              <div className={cn(
                                'text-xs flex items-center justify-end gap-1',
                                change >= 0 ? 'text-emerald-400' : 'text-red-400'
                              )}>
                                {change >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-red-400/70 font-medium">CLOSED</span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
