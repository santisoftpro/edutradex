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

export default function TradePage() {
  const { user, syncBalanceFromServer, updateDemoBalance, updatePracticeBalance, getActiveBalance, switchAccount, isHydrated } = useAuthStore();
  const { placeTrade, syncFromApi } = useTradeStore();
  const activeTradesCount = useActiveTradesCount(); // Filtered by current account type
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

  // Force LIVE mode when on this page
  useEffect(() => {
    if (user && user.activeAccountType !== 'LIVE') {
      switchAccount('LIVE');
    }
  }, [user, switchAccount]);

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

  // Note: We subscribe to ALL assets in the earlier useEffect
  // This ensures the selected asset is also subscribed (in case subscribeAll hasn't completed yet)
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
    // Crypto symbols
    if (symbol.endsWith('/USDT') || symbol.includes('BTC') || symbol.includes('ETH')) {
      return 'crypto';
    }
    // Index symbols
    if (['SPX500', 'NASDAQ', 'DJI', 'DAX', 'FTSE100', 'NIKKEI'].some(idx => symbol.includes(idx))) {
      return 'index';
    }
    // Stock symbols (typically single uppercase words like AAPL, GOOGL)
    if (/^[A-Z]{1,5}$/.test(symbol)) {
      return 'stock';
    }
    // Default to forex (currency pairs like EUR/USD)
    return 'forex';
  };

  const handleTrade = useCallback(
    async (direction: 'UP' | 'DOWN', amount: number, duration: number) => {
      if (!user) return;

      // Generate unique key for this trade action
      const tradeKey = `${direction}-${Date.now()}`;

      // Play sound immediately for instant feedback
      if (direction === 'UP') {
        playBuySound();
      } else {
        playSellSound();
      }

      // Track this specific trade placement (allows multiple concurrent trades)
      setPlacingTrades(prev => new Set(prev).add(tradeKey));

      // Use current price from WebSocket (already available, no API call needed)
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

        // Optimistically deduct from the correct balance based on account type
        // NOTE: Due to legacy naming:
        // - 'LIVE' mode uses demoBalance (which is actually the real money)
        // - 'DEMO' mode uses practiceBalance (which is the practice/demo money)
        const currentBalance = getActiveBalance();
        if (user.activeAccountType === 'LIVE') {
          updateDemoBalance(currentBalance - amount);
        } else {
          updatePracticeBalance(currentBalance - amount);
        }

        toast.success(`Trade placed: ${direction} on ${selectedAsset} for $${amount}`, {
          duration: 3000,
        });

        // Sync balance in background to confirm server state
        syncBalanceFromServer();
      } catch (error: unknown) {
        console.error('Trade failed:', error);
        // Extract error message from API response
        const errorMessage = error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to place trade';
        toast.error(errorMessage, {
          duration: 4000,
        });
      } finally {
        // Remove this trade from loading set
        setPlacingTrades(prev => {
          const newSet = new Set(prev);
          newSet.delete(tradeKey);
          return newSet;
        });
      }
    },
    [user, selectedAsset, currentPrice, syncBalanceFromServer, updateDemoBalance, updatePracticeBalance, getActiveBalance, placeTrade]
  );

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-[#1079ff] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-400">Loading trading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d0d1a] overflow-hidden">
      {/* ===== DESKTOP LAYOUT ===== */}
      <div className="hidden md:block">
        <TradingHeader
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          currentPrice={currentPrice}
          livePrices={latestPrices}
        />
        <FavoritePairsBar
          selectedAsset={selectedAsset}
          onSelectAsset={handleSelectAsset}
          livePrices={latestPrices}
        />
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      {/* Mobile Asset Bar - replaces header on trade page */}
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
      {/* Mobile: pb-[145px] for unified trading panel with integrated nav */}
      {/* Desktop: pb-0 */}
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
          balance={getActiveBalance()}
          onTrade={handleTrade}
          currentPrice={currentPrice?.price}
          isTradesPanelOpen={isTradesPanelOpen}
          initialDuration={selectedDuration}
          onDurationChange={handleSelectDuration}
          isLoading={placingTrades.size > 0}
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
      {/* Mobile Trading Panel - unified with integrated navigation */}
      <MobileTradingPanel
        balance={getActiveBalance()}
        onTrade={handleTrade}
        onDurationChange={handleSelectDuration}
        initialDuration={selectedDuration}
        isLoading={placingTrades.size > 0}
        onOpenTrades={() => setIsMobileTradesOpen(true)}
        onOpenCopyTrading={() => setIsMobileCopyTradingOpen(true)}
        activeTradesCount={activeTradesCount}
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
