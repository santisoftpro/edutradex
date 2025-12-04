'use client';

import { useState } from 'react';
import { ChevronDown, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  category: 'forex' | 'otc' | 'crypto';
}

const ASSETS: Asset[] = [
  // Major Forex pairs
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0852, change: 0.12, category: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', price: 1.2634, change: -0.08, category: 'forex' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', price: 149.85, change: 0.25, category: 'forex' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', price: 0.6542, change: -0.15, category: 'forex' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', price: 1.3625, change: 0.05, category: 'forex' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', price: 0.5932, change: 0.08, category: 'forex' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', price: 0.8845, change: -0.03, category: 'forex' },

  // EUR crosses
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', price: 0.8592, change: 0.05, category: 'forex' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', price: 162.45, change: 0.18, category: 'forex' },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', price: 1.6590, change: -0.12, category: 'forex' },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', price: 1.4785, change: 0.09, category: 'forex' },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', price: 0.9595, change: 0.02, category: 'forex' },
  { symbol: 'EUR/NZD', name: 'Euro / New Zealand Dollar', price: 1.8295, change: -0.07, category: 'forex' },

  // GBP crosses
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', price: 189.35, change: 0.32, category: 'forex' },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', price: 1.9315, change: -0.15, category: 'forex' },
  { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', price: 1.7215, change: 0.11, category: 'forex' },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', price: 1.1175, change: 0.04, category: 'forex' },
  { symbol: 'GBP/NZD', name: 'British Pound / New Zealand Dollar', price: 2.1305, change: -0.09, category: 'forex' },

  // JPY crosses
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', price: 98.05, change: 0.22, category: 'forex' },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', price: 109.95, change: 0.15, category: 'forex' },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', price: 169.35, change: -0.08, category: 'forex' },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', price: 88.85, change: 0.19, category: 'forex' },

  // Other crosses
  { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', price: 0.8915, change: 0.06, category: 'forex' },
  { symbol: 'AUD/CHF', name: 'Australian Dollar / Swiss Franc', price: 0.5785, change: -0.04, category: 'forex' },
  { symbol: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar', price: 1.1025, change: 0.03, category: 'forex' },
  { symbol: 'CAD/CHF', name: 'Canadian Dollar / Swiss Franc', price: 0.6495, change: 0.02, category: 'forex' },
  { symbol: 'NZD/CAD', name: 'New Zealand Dollar / Canadian Dollar', price: 0.8085, change: -0.05, category: 'forex' },
  { symbol: 'NZD/CHF', name: 'New Zealand Dollar / Swiss Franc', price: 0.5245, change: 0.01, category: 'forex' },

  // OTC Forex pairs
  { symbol: 'OTC_EUR/USD', name: 'OTC Euro / US Dollar', price: 1.0852, change: 0.18, category: 'otc' },
  { symbol: 'OTC_GBP/USD', name: 'OTC British Pound / US Dollar', price: 1.2634, change: -0.12, category: 'otc' },
  { symbol: 'OTC_USD/JPY', name: 'OTC US Dollar / Japanese Yen', price: 149.85, change: 0.28, category: 'otc' },
  { symbol: 'OTC_AUD/USD', name: 'OTC Australian Dollar / US Dollar', price: 0.6542, change: -0.18, category: 'otc' },
  { symbol: 'OTC_GBP/JPY', name: 'OTC British Pound / Japanese Yen', price: 189.35, change: 0.35, category: 'otc' },
  { symbol: 'OTC_EUR/JPY', name: 'OTC Euro / Japanese Yen', price: 162.45, change: 0.22, category: 'otc' },

  // Volatility indices
  { symbol: 'VOL_10', name: 'Volatility 10 Index', price: 1000.00, change: 1.24, category: 'otc' },
  { symbol: 'VOL_25', name: 'Volatility 25 Index', price: 1000.00, change: -0.87, category: 'otc' },
  { symbol: 'VOL_50', name: 'Volatility 50 Index', price: 1000.00, change: 2.15, category: 'otc' },
  { symbol: 'VOL_75', name: 'Volatility 75 Index', price: 1000.00, change: -1.05, category: 'otc' },
  { symbol: 'VOL_100', name: 'Volatility 100 Index', price: 1000.00, change: -1.52, category: 'otc' },

  // 1-second Volatility indices
  { symbol: 'VOL_10_1S', name: 'Volatility 10 (1s) Index', price: 5000.00, change: 0.85, category: 'otc' },
  { symbol: 'VOL_25_1S', name: 'Volatility 25 (1s) Index', price: 5000.00, change: -0.62, category: 'otc' },
  { symbol: 'VOL_50_1S', name: 'Volatility 50 (1s) Index', price: 5000.00, change: 1.45, category: 'otc' },
  { symbol: 'VOL_75_1S', name: 'Volatility 75 (1s) Index', price: 5000.00, change: -0.98, category: 'otc' },
  { symbol: 'VOL_100_1S', name: 'Volatility 100 (1s) Index', price: 5000.00, change: -1.25, category: 'otc' },
];

interface AssetSelectorProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice?: number | null;
  currentChange?: number | null;
}

export function AssetSelector({ selectedAsset, onSelectAsset, currentPrice, currentChange }: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'forex' | 'otc' | 'crypto'>('all');

  const currentAsset = ASSETS.find((a) => a.symbol === selectedAsset) || ASSETS[0];

  // Use real-time price if available, otherwise fallback to static price
  const displayPrice = currentPrice ?? currentAsset.price;
  const displayChange = currentChange ?? currentAsset.change;

  const filteredAssets = ASSETS.filter((asset) => {
    const matchesSearch =
      asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
      asset.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || asset.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="relative">
      {/* Selected Asset Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-[#252542] hover:bg-[#2d2d52] rounded-lg transition-colors"
      >
        <div className="text-left">
          <div className="text-white font-semibold text-sm md:text-base">{currentAsset.symbol}</div>
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
          <div className="fixed md:absolute inset-x-2 md:inset-x-auto bottom-2 md:bottom-auto md:top-full md:left-0 md:mt-2 md:w-80 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl z-50">
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
            <div className="flex gap-1 p-2 border-b border-[#2d2d44]">
              {(['all', 'forex', 'otc'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'px-3 py-1 rounded text-xs font-medium transition-colors',
                    category === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#252542] text-gray-400 hover:text-white'
                  )}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Asset List */}
            <div className="max-h-[50vh] md:max-h-64 overflow-y-auto">
              {filteredAssets.map((asset) => (
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
                    <div className="text-gray-500 text-xs">{asset.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white text-sm">${asset.price.toFixed(4)}</div>
                    <div
                      className={cn(
                        'text-xs',
                        asset.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {asset.change >= 0 ? '+' : ''}
                      {asset.change}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
