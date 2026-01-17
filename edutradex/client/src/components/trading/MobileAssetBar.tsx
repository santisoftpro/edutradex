'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Search,
  Loader2,
  Clock,
  MoreHorizontal,
  Undo2,
  Trash2,
  Menu,
  X,
  User,
  LayoutDashboard,
  LineChart,
  Wallet,
  History,
  ArrowUpFromLine,
  Receipt,
  BarChart3,
  Gift,
  Settings,
  HelpCircle,
  Shield,
  LogOut,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useTradeStore } from '@/store/trade.store';
import { useAuthStore } from '@/store/auth.store';
import { api, PriceTick, MarketAsset } from '@/lib/api';
import { cn, isMarketOpen, MarketType } from '@/lib/utils';

type AssetCategory = 'all' | 'forex' | 'crypto' | 'stocks' | 'indices';

interface MobileAssetBarProps {
  selectedAsset: string;
  onSelectAsset: (symbol: string) => void;
  currentPrice: PriceTick | null;
  expirationTime: number;
  livePrices?: Map<string, PriceTick>;
  onOpenChartSettings?: () => void;
  // Drawing controls
  drawnLinesCount?: number;
  onUndoDrawing?: () => void;
  onClearDrawings?: () => void;
  // Balance and account
  balance?: number;
  accountType?: 'LIVE' | 'DEMO';
  onSwitchAccount?: (type: 'LIVE' | 'DEMO') => void;
}

function getAssetCategory(asset: MarketAsset): AssetCategory {
  if (asset.marketType === 'forex') return 'forex';
  if (asset.marketType === 'crypto') return 'crypto';
  if (asset.marketType === 'stock') return 'stocks';
  if (asset.marketType === 'index') return 'indices';
  return 'forex';
}

function getMarketType(asset: MarketAsset): MarketType {
  if (asset.marketType === 'forex') return 'forex';
  if (asset.marketType === 'crypto') return 'crypto';
  if (asset.marketType === 'stock') return 'stock';
  if (asset.marketType === 'index') return 'index';
  return 'forex';
}

const CATEGORY_LABELS: Record<AssetCategory, string> = {
  all: 'All',
  forex: 'Forex',
  crypto: 'Crypto',
  stocks: 'Stocks',
  indices: 'Indices',
};

// Navigation items for the mobile menu
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/history', label: 'History', icon: History },
  { href: '/dashboard/copy-trading', label: 'Copy Trading', icon: Users },
  { href: '/dashboard/deposit', label: 'Deposit', icon: Wallet },
  { href: '/dashboard/withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
  { href: '/dashboard/transactions', label: 'Transactions', icon: Receipt },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/affiliate', label: 'Affiliate', icon: Gift },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  { href: '/dashboard/support', label: 'Support', icon: HelpCircle },
];

export function MobileAssetBar({
  selectedAsset,
  onSelectAsset,
  currentPrice,
  expirationTime,
  livePrices,
  onOpenChartSettings,
  drawnLinesCount = 0,
  onUndoDrawing,
  onClearDrawings,
  balance,
  accountType = 'LIVE',
  onSwitchAccount,
}: MobileAssetBarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [showAssetMenu, setShowAssetMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory>('all');
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expirationDisplay, setExpirationDisplay] = useState('');
  const { activeTrades } = useTradeStore();

  const isAdmin = user?.role === 'ADMIN';

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    router.push('/login');
  };

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

  // Check market status
  const [marketStatus, setMarketStatus] = useState<Record<MarketType, boolean>>({
    forex: true,
    crypto: true,
    stock: true,
    index: true,
  });

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
    const interval = setInterval(checkMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Update expiration time display every second
  useEffect(() => {
    const updateExpiration = () => {
      const now = new Date();
      const expiration = new Date(now.getTime() + expirationTime * 1000);
      setExpirationDisplay(expiration.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    };

    updateExpiration(); // Initial update
    const interval = setInterval(updateExpiration, 1000);
    return () => clearInterval(interval);
  }, [expirationTime]);

  // Filter assets
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

  // Category counts
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

  const visibleCategories: AssetCategory[] = (['all', 'forex', 'crypto', 'stocks', 'indices'] as AssetCategory[])
    .filter(cat => cat === 'all' || categoryCounts[cat] > 0);

  // Current asset
  const currentAsset = useMemo(() => {
    return assets.find((a) => a.symbol === selectedAsset);
  }, [assets, selectedAsset]);

  return (
    <div className="md:hidden bg-[#0d0d1a]">
      {/* Navigation Slide-out Menu */}
      {showNavMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[70]"
            onClick={() => setShowNavMenu(false)}
          />

          {/* Menu Panel */}
          <div className="fixed inset-y-0 left-0 w-72 bg-[#1a1a2e] z-[80] flex flex-col animate-slide-in-left">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2d2d44]">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="OptigoBroker" width={28} height={28} />
                <span className="text-lg font-bold text-white">OptigoBroker</span>
              </div>
              <button
                onClick={() => setShowNavMenu(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-[#252542] rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 border-b border-[#2d2d44]">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-xl flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">{user.name}</p>
                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Balance Display */}
                {balance !== undefined && (
                  <div className={cn(
                    'mt-3 flex items-center justify-between rounded-xl px-3 py-2.5',
                    accountType === 'LIVE'
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-amber-500/10 border border-amber-500/30'
                  )}>
                    <div className="flex items-center gap-2">
                      <Wallet className={cn('h-4 w-4', accountType === 'LIVE' ? 'text-emerald-400' : 'text-amber-400')} />
                      <span className={cn('text-xs font-semibold', accountType === 'LIVE' ? 'text-emerald-400' : 'text-amber-400')}>
                        {accountType}
                      </span>
                    </div>
                    <span className={cn('font-bold', accountType === 'LIVE' ? 'text-emerald-400' : 'text-amber-400')}>
                      ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-3">
              <div className="px-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowNavMenu(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-[#252542] hover:text-white transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#252542] flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  );
                })}

                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setShowNavMenu(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Shield className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-sm">Admin Panel</span>
                  </Link>
                )}
              </div>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-[#2d2d44]">
              <button
                onClick={() => {
                  setShowNavMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium text-sm">Sign Out</span>
              </button>
            </div>
          </div>

          <style jsx global>{`
            @keyframes slide-in-left {
              from { transform: translateX(-100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in-left {
              animation: slide-in-left 0.2s ease-out;
            }
          `}</style>
        </>
      )}

      {/* Asset Row */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* Left Side - Menu, Asset Selector and Active Trades */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setShowNavMenu(true)}
            className="flex items-center justify-center w-10 h-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg active:bg-[#252542] transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-400" />
          </button>

          {/* Asset Selector */}
          <div className="relative flex items-center gap-1.5">
            <button
              onClick={() => setShowAssetMenu(!showAssetMenu)}
              className="flex items-center gap-2 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg px-3 py-2 min-h-[40px] active:bg-[#252542]"
            >
              <span className="text-white font-semibold text-sm">{selectedAsset}</span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Chart Settings Button (3-dot menu) */}
            {onOpenChartSettings && (
              <button
                onClick={onOpenChartSettings}
                className="flex items-center justify-center w-10 h-10 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg active:bg-[#252542] transition-colors"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-400" />
              </button>
            )}

            {/* Drawing Controls - Show when there are drawings */}
            {drawnLinesCount > 0 && (
              <div className="flex items-center gap-1">
                {/* Undo Last Drawing */}
                {onUndoDrawing && (
                  <button
                    onClick={onUndoDrawing}
                    className="flex items-center justify-center w-9 h-9 bg-yellow-500/20 border border-yellow-500/30 rounded-lg active:bg-yellow-500/30 transition-colors"
                    title="Undo last drawing"
                  >
                    <Undo2 className="h-4 w-4 text-yellow-400" />
                  </button>
                )}

                {/* Clear All Drawings */}
                {onClearDrawings && (
                  <button
                    onClick={onClearDrawings}
                    className="flex items-center justify-center w-9 h-9 bg-red-500/20 border border-red-500/30 rounded-lg active:bg-red-500/30 transition-colors"
                    title="Clear all drawings"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                )}

                {/* Drawing Count Badge */}
                <span className="text-[10px] text-orange-400 font-bold bg-orange-500/20 px-1.5 py-0.5 rounded">
                  {drawnLinesCount}
                </span>
              </div>
            )}

            {showAssetMenu && (
              <>
                <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowAssetMenu(false)} />
                <div className="fixed inset-x-2 bottom-2 top-auto max-h-[70vh] bg-[#1a1a2e] border border-[#2d2d44] rounded-xl shadow-2xl z-50 flex flex-col">
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
                  <div className="flex flex-wrap gap-2 p-3 border-b border-[#2d2d44]">
                    {visibleCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={cn(
                          'px-4 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                          category === cat
                            ? 'bg-[#1079ff] text-white'
                            : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
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
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : filteredAssets.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No assets found
                      </div>
                    ) : (
                      filteredAssets.map((asset) => {
                        const liveData = livePrices?.get(asset.symbol);
                        const price = liveData?.price ?? asset.basePrice;
                        const change = liveData?.changePercent ?? 0;
                        const assetMarketType = getMarketType(asset);
                        const isAssetMarketOpen = marketStatus[assetMarketType];

                        return (
                          <button
                            key={asset.symbol}
                            onClick={() => {
                              if (isAssetMarketOpen) {
                                onSelectAsset(asset.symbol);
                                setShowAssetMenu(false);
                                setSearch('');
                              }
                            }}
                            disabled={!isAssetMarketOpen}
                            className={cn(
                              'w-full flex items-center justify-between px-4 py-3 transition-colors',
                              selectedAsset === asset.symbol && 'bg-[#252542]',
                              isAssetMarketOpen
                                ? 'hover:bg-[#252542] active:bg-[#2d2d52]'
                                : 'opacity-50 bg-[#151525]'
                            )}
                          >
                            <div className="text-left">
                              <div className={cn(
                                'font-medium text-sm',
                                isAssetMarketOpen ? 'text-white' : 'text-gray-500'
                              )}>
                                {asset.symbol}
                              </div>
                              <div className="text-gray-500 text-xs truncate max-w-[150px]">
                                {isAssetMarketOpen ? asset.name : 'Market Closed'}
                              </div>
                            </div>
                            <div className="text-right">
                              {isAssetMarketOpen ? (
                                <>
                                  <div className="text-white text-sm">
                                    ${price.toFixed(price > 100 ? 2 : price < 0.01 ? 6 : 4)}
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
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Active Trades Indicator */}
          {activeTrades.length > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg px-2.5 py-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-blue-400 text-xs font-bold">{activeTrades.length}</span>
            </div>
          )}
        </div>

        {/* Right Side - Expiration Time */}
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-[11px] font-medium">Expiration</span>
          <span className="text-white text-sm font-semibold">{expirationDisplay}</span>
        </div>
      </div>

      {/* Balance & Account Row */}
      {balance !== undefined && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-[#1a1a2e]">
          {/* Balance Display */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#1a1a2e] rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400 text-[10px] font-medium">BAL</span>
              <span className="text-white text-sm font-bold">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Account Type Switcher */}
          {onSwitchAccount && (
            <div className="flex items-center bg-[#1a1a2e] rounded-lg p-0.5">
              <button
                onClick={() => onSwitchAccount('LIVE')}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-semibold transition-all',
                  accountType === 'LIVE'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                LIVE
              </button>
              <button
                onClick={() => onSwitchAccount('DEMO')}
                className={cn(
                  'px-3 py-1 rounded-md text-[11px] font-semibold transition-all',
                  accountType === 'DEMO'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                DEMO
              </button>
            </div>
          )}
        </div>
      )}

      {/* Price Display Row */}
      {currentPrice && (
        <div className="flex items-center gap-2 px-3 pb-1.5">
          <span className="text-white text-sm font-medium">
            {currentPrice.price.toFixed(currentPrice.price > 100 ? 2 : 5)}
          </span>
          <span className="text-gray-500 text-xs">
            {formatTime(currentPrice.timestamp)} UTC+2
          </span>
        </div>
      )}
    </div>
  );
}
