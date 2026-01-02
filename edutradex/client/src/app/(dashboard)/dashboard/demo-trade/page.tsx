'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { TradingHeader } from '@/components/trading/TradingHeader';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { PriceChart, PriceChartHandle } from '@/components/trading/PriceChart';
import { ActiveTrades } from '@/components/trading/ActiveTrades';
import { TradesSidebar } from '@/components/trading/TradesSidebar';
import { RightMenu } from '@/components/trading/RightMenu';
import { MobileAssetBar } from '@/components/trading/MobileAssetBar';
import { MobileTradingPanel } from '@/components/trading/MobileTradingPanel';
import { MobileTradesSheet } from '@/components/trading/MobileTradesSheet';
import { MobileChartSettingsSheet } from '@/components/trading/MobileChartSettingsSheet';
import { MobileCopyTradingSheet } from '@/components/trading/MobileCopyTradingSheet';
import { FavoritePairsBar } from '@/components/trading/FavoritePairsBar';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore, useActiveTradesCount } from '@/store/trade.store';
import { useChartStore } from '@/store/chart.store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api, PriceTick } from '@/lib/api';
import { playBuySound, playSellSound } from '@/lib/sounds';

const SELECTED_ASSET_KEY = 'optigobroker-selected-asset';
const SELECTED_DURATION_KEY = 'optigobroker-selected-duration';

export default function DemoTradePage() {
  const { user, syncBalanceFromServer, updatePracticeBalance, switchAccount, isHydrated } = useAuthStore();
  const { placeTrade, syncFromApi } = useTradeStore();
  const activeTradesCount = useActiveTradesCount();
  const { isConnected, latestPrices, subscribe, unsubscribe, subscribeAll } = useWebSocket();
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [currentPrice, setCurrentPrice] = useState<PriceTick | null>(null);
  const [isTradesPanelOpen, setIsTradesPanelOpen] = useState(false);
  const [isMobileTradesOpen, setIsMobileTradesOpen] = useState(false);
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);
  const [isMobileCopyTradingOpen, setIsMobileCopyTradingOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(300);
  const [placingTrades, setPlacingTrades] = useState<Set<string>>(new Set());
  const [drawnLinesCount, setDrawnLinesCount] = useState(0);
  const hasSubscribedAllRef = useRef(false);
  const priceChartRef = useRef<PriceChartHandle>(null);

  // Chart settings from store
  const {
    selectedTimeframe,
    setTimeframe,
    chartType,
    setChartType,
    indicators,
    toggleIndicator,
    showVolume,
    toggleVolume,
    drawingTool,
    setDrawingTool,
  } = useChartStore();

  // Force DEMO mode when on this page
  useEffect(() => {
    if (user && user.activeAccountType !== 'DEMO') {
      switchAccount('DEMO');
    }
  }, [user, switchAccount]);

  // Drawing control handlers
  const handleUndoDrawing = useCallback(() => {
    priceChartRef.current?.undoDrawing();
  }, []);

  const handleClearDrawings = useCallback(() => {
    priceChartRef.current?.clearDrawings();
  }, []);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    const savedAsset = localStorage.getItem(SELECTED_ASSET_KEY);
    if (savedAsset) {
      setSelectedAsset(savedAsset);
    }
    const savedDuration = localStorage.getItem(SELECTED_DURATION_KEY);
    if (savedDuration) {
      setSelectedDuration(parseInt(savedDuration, 10));
    }
  }, []);

  // Subscribe to ALL assets for live prices in the dropdown
  useEffect(() => {
    async function subscribeToAllAssets() {
      if (!isConnected || hasSubscribedAllRef.current) return;

      try {
        const allAssets = await api.getAllAssets();
        const symbols = allAssets.map(asset => asset.symbol);
        if (symbols.length > 0) {
          subscribeAll(symbols);
          hasSubscribedAllRef.current = true;
        }
      } catch (error) {
        console.error('Failed to subscribe to all assets:', error);
      }
    }

    subscribeToAllAssets();
  }, [isConnected, subscribeAll]);

  // Save selected asset to localStorage when it changes
  const handleSelectAsset = useCallback((symbol: string) => {
    setSelectedAsset(symbol);
    localStorage.setItem(SELECTED_ASSET_KEY, symbol);
  }, []);

  // Save selected duration to localStorage when it changes
  const handleSelectDuration = useCallback((duration: number) => {
    setSelectedDuration(duration);
    localStorage.setItem(SELECTED_DURATION_KEY, duration.toString());
  }, []);

  useEffect(() => {
    if (isHydrated && user) {
      syncBalanceFromServer();
      syncFromApi();
    }
  }, [isHydrated, user, syncBalanceFromServer, syncFromApi]);

  useEffect(() => {
    if (isConnected && !hasSubscribedAllRef.current) {
      subscribe(selectedAsset);
    }
  }, [selectedAsset, isConnected, subscribe]);

  useEffect(() => {
    const price = latestPrices.get(selectedAsset);
    if (price) {
      setCurrentPrice(price);
    }
  }, [latestPrices, selectedAsset]);

  const getMarketType = (symbol: string): 'forex' | 'crypto' | 'stock' | 'index' => {
    if (symbol.endsWith('/USDT') || symbol.includes('BTC') || symbol.includes('ETH')) {
      return 'crypto';
    }
    if (['SPX500', 'NASDAQ', 'DJI', 'DAX', 'FTSE100', 'NIKKEI'].some(idx => symbol.includes(idx))) {
      return 'index';
    }
    if (/^[A-Z]{1,5}$/.test(symbol)) {
      return 'stock';
    }
    return 'forex';
  };

  // Get demo/practice balance
  const getDemoBalance = () => user?.practiceBalance ?? 10000;

  const handleTrade = useCallback(
    async (direction: 'UP' | 'DOWN', amount: number, duration: number) => {
      if (!user) return;

      const tradeKey = `${direction}-${Date.now()}`;

      if (direction === 'UP') {
        playBuySound();
      } else {
        playSellSound();
      }

      setPlacingTrades(prev => new Set(prev).add(tradeKey));

      const entryPrice = currentPrice?.price || 1.0852;
      const marketType = getMarketType(selectedAsset);

      try {
        const trade = await placeTrade({
          symbol: selectedAsset,
          direction,
          amount,
          duration,
          entryPrice,
          marketType,
        });

        // Demo mode always uses practiceBalance
        const currentBalance = getDemoBalance();
        updatePracticeBalance(currentBalance - amount);

        toast.success(`Demo trade placed: ${direction} on ${selectedAsset} for $${amount}`, {
          duration: 3000,
        });

        syncBalanceFromServer();
      } catch (error: unknown) {
        console.error('Trade failed:', error);
        const errorMessage = error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to place trade';
        toast.error(errorMessage, {
          duration: 4000,
        });
      } finally {
        setPlacingTrades(prev => {
          const newSet = new Set(prev);
          newSet.delete(tradeKey);
          return newSet;
        });
      }
    },
    [user, selectedAsset, currentPrice, syncBalanceFromServer, updatePracticeBalance, placeTrade]
  );

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading demo trading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d0d1a] overflow-hidden">
      {/* Demo Mode Banner - Desktop */}
      <div className="hidden md:flex items-center justify-center gap-2 bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4">
        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
        <span className="text-amber-400 text-xs font-medium">
          DEMO MODE - Practice trading with virtual funds (${getDemoBalance().toLocaleString()})
        </span>
        <a
          href="/dashboard/trade"
          className="ml-4 text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Switch to Real Trading
        </a>
      </div>

      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden md:block">
        <TradingHeader
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          currentPrice={currentPrice}
          livePrices={latestPrices}
          isDemoMode={true}
        />
        <FavoritePairsBar
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          livePrices={latestPrices}
        />
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      {/* Demo Mode Banner - Mobile */}
      <div className="md:hidden flex items-center justify-between bg-amber-500/10 border-b border-amber-500/20 py-2 px-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span className="text-amber-400 text-xs font-medium">DEMO MODE</span>
        </div>
        <a
          href="/dashboard/trade"
          className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2"
        >
          Go to Real
        </a>
      </div>

      {/* Mobile Asset Bar - replaces header on demo trade page */}
      <MobileAssetBar
        selectedAsset={selectedAsset}
        onSelectAsset={handleSelectAsset}
        currentPrice={currentPrice}
        expirationTime={selectedDuration}
        livePrices={latestPrices}
        onOpenChartSettings={() => setIsChartSettingsOpen(true)}
        drawnLinesCount={drawnLinesCount}
        onUndoDrawing={handleUndoDrawing}
        onClearDrawings={handleClearDrawings}
      />

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 flex overflow-hidden pb-[145px] md:pb-0">
        {/* Chart Area */}
        <div className="flex-1 h-full relative overflow-hidden">
          <PriceChart
            ref={priceChartRef}
            symbol={selectedAsset}
            currentPrice={currentPrice}
            onDrawingsChange={setDrawnLinesCount}
          />
          <ActiveTrades latestPrices={latestPrices} />
        </div>

        {/* Desktop Trading Panel */}
        <TradingPanel
          balance={getDemoBalance()}
          onTrade={handleTrade}
          currentPrice={currentPrice?.price}
          isTradesPanelOpen={isTradesPanelOpen}
          initialDuration={selectedDuration}
          onDurationChange={handleSelectDuration}
          isLoading={placingTrades.size > 0}
          isDemoMode={true}
        />

        {/* Desktop Trades Sidebar */}
        {isTradesPanelOpen && (
          <TradesSidebar
            isCollapsed={false}
            onToggle={() => setIsTradesPanelOpen(false)}
            latestPrices={latestPrices}
          />
        )}
      </div>

      {/* Desktop Right Menu */}
      <RightMenu
        isTradesPanelOpen={isTradesPanelOpen}
        onToggleTradesPanel={() => setIsTradesPanelOpen(!isTradesPanelOpen)}
      />

      {/* ===== MOBILE FIXED BOTTOM ELEMENTS ===== */}
      <MobileTradingPanel
        balance={getDemoBalance()}
        onTrade={handleTrade}
        onDurationChange={handleSelectDuration}
        initialDuration={selectedDuration}
        isLoading={placingTrades.size > 0}
        onOpenTrades={() => setIsMobileTradesOpen(true)}
        onOpenCopyTrading={() => setIsMobileCopyTradingOpen(true)}
        activeTradesCount={activeTradesCount}
        isDemoMode={true}
      />

      {/* Mobile Trades Sheet */}
      <MobileTradesSheet
        isOpen={isMobileTradesOpen}
        onClose={() => setIsMobileTradesOpen(false)}
        latestPrices={latestPrices}
      />

      {/* Mobile Chart Settings Sheet */}
      <MobileChartSettingsSheet
        isOpen={isChartSettingsOpen}
        onClose={() => setIsChartSettingsOpen(false)}
        selectedTimeframe={selectedTimeframe}
        onTimeframeChange={setTimeframe}
        chartType={chartType}
        onChartTypeChange={setChartType}
        indicators={indicators}
        onToggleIndicator={toggleIndicator}
        showVolume={showVolume}
        onToggleVolume={toggleVolume}
        drawingTool={drawingTool}
        onDrawingToolChange={setDrawingTool}
        drawnLinesCount={drawnLinesCount}
        onClearDrawings={handleClearDrawings}
      />

      {/* Mobile Copy Trading Sheet */}
      <MobileCopyTradingSheet
        isOpen={isMobileCopyTradingOpen}
        onClose={() => setIsMobileCopyTradingOpen(false)}
      />
    </div>
  );
}
