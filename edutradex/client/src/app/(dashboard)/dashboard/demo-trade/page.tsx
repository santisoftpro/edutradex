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
import { TradeConfirmModal } from '@/components/trading/TradeConfirmModal';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore, useActiveTradesCount } from '@/store/trade.store';
import { useChartStore } from '@/store/chart.store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useTradingShortcuts } from '@/hooks/useTradingShortcuts';
import { api, PriceTick } from '@/lib/api';
import { playBuySound, playSellSound } from '@/lib/sounds';
import {
  QUICK_AMOUNTS,
  DURATION_VALUES,
  STORAGE_KEYS,
  LARGE_TRADE_THRESHOLD,
  DEFAULT_DURATION,
  DEFAULT_AMOUNT,
  validateStoredAsset,
  validateStoredDuration,
  validateStoredAmount,
} from '@/constants/trading';
import { getMarketType } from '@/lib/utils';

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
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION);
  const [selectedAmount, setSelectedAmount] = useState(DEFAULT_AMOUNT);
  const [placingTrades, setPlacingTrades] = useState<Set<string>>(new Set());
  const [drawnLinesCount, setDrawnLinesCount] = useState(0);
  const [assetPayout, setAssetPayout] = useState(98); // Default payout, will be updated from asset config
  const [pendingTrade, setPendingTrade] = useState<{
    direction: 'UP' | 'DOWN';
    amount: number;
    duration: number;
  } | null>(null);
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
    updateIndicatorParams,
    showVolume,
    toggleVolume,
    drawingTool,
    setDrawingTool,
  } = useChartStore();

  // Force DEMO mode when on this page
  useEffect(() => {
    if (user && user.activeAccountType !== 'DEMO') {
      switchAccount('DEMO');
      toast('Switched to Demo Trading mode', {
        icon: '🎮',
        duration: 3000,
      });
    }
  }, [user, switchAccount]);

  // Drawing control handlers
  const handleUndoDrawing = useCallback(() => {
    priceChartRef.current?.undoDrawing();
  }, []);

  const handleClearDrawings = useCallback(() => {
    priceChartRef.current?.clearDrawings();
  }, []);

  // Load saved preferences from localStorage on mount with validation
  useEffect(() => {
    const savedAsset = localStorage.getItem(STORAGE_KEYS.SELECTED_ASSET);
    const validatedAsset = validateStoredAsset(savedAsset, 'EUR/USD');
    if (validatedAsset !== 'EUR/USD') {
      setSelectedAsset(validatedAsset);
    }

    const savedDuration = localStorage.getItem(STORAGE_KEYS.SELECTED_DURATION);
    const validatedDuration = validateStoredDuration(savedDuration);
    if (validatedDuration !== DEFAULT_DURATION) {
      setSelectedDuration(validatedDuration);
    }

    const savedAmount = localStorage.getItem(STORAGE_KEYS.SELECTED_AMOUNT);
    const validatedAmount = validateStoredAmount(savedAmount);
    if (validatedAmount !== DEFAULT_AMOUNT) {
      setSelectedAmount(validatedAmount);
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
    localStorage.setItem(STORAGE_KEYS.SELECTED_ASSET, symbol);
  }, []);

  // Save selected duration to localStorage when it changes
  const handleSelectDuration = useCallback((duration: number) => {
    setSelectedDuration(duration);
    localStorage.setItem(STORAGE_KEYS.SELECTED_DURATION, duration.toString());
  }, []);

  // Save selected amount to localStorage when it changes
  const handleSelectAmount = useCallback((amount: number) => {
    setSelectedAmount(amount);
    localStorage.setItem(STORAGE_KEYS.SELECTED_AMOUNT, amount.toString());
  }, []);

  // Handle duration navigation (Q/E keys)
  const handleDurationNav = useCallback((direction: number) => {
    setSelectedDuration(prev => {
      const currentIndex = DURATION_VALUES.indexOf(prev);
      const newIndex = Math.max(0, Math.min(DURATION_VALUES.length - 1, currentIndex + direction));
      const newDuration = DURATION_VALUES[newIndex];
      localStorage.setItem(STORAGE_KEYS.SELECTED_DURATION, newDuration.toString());
      return newDuration;
    });
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

  // Fetch asset payout when selected asset changes
  useEffect(() => {
    async function fetchAssetPayout() {
      try {
        const asset = await api.getAsset(selectedAsset);
        if (asset?.payoutPercent) {
          setAssetPayout(asset.payoutPercent);
        }
      } catch (error) {
        console.error('Failed to fetch asset payout:', error);
        // Keep default payout on error
      }
    }
    fetchAssetPayout();
  }, [selectedAsset]);

  // Get demo/practice balance
  const getDemoBalance = () => user?.practiceBalance ?? 10000;

  // Execute the actual trade (called directly or after confirmation)
  const executeTrade = useCallback(
    async (direction: 'UP' | 'DOWN', tradeAmount: number, tradeDuration: number) => {
      if (!user) return;

      // Validate price is available before trading
      if (!currentPrice?.price) {
        toast.error('Waiting for price data. Please try again.', { duration: 3000 });
        return;
      }

      const tradeKey = `${direction}-${Date.now()}`;
      setPlacingTrades(prev => new Set(prev).add(tradeKey));

      const entryPrice = currentPrice.price;
      const marketType = getMarketType(selectedAsset);

      try {
        const trade = await placeTrade({
          symbol: selectedAsset,
          direction,
          amount: tradeAmount,
          duration: tradeDuration,
          entryPrice,
          marketType,
        });

        // Play sound only on successful trade
        if (direction === 'UP') {
          playBuySound();
        } else {
          playSellSound();
        }

        // Demo mode always uses practiceBalance
        const currentBalance = getDemoBalance();
        updatePracticeBalance(currentBalance - tradeAmount);

        toast.success(`Demo trade placed: ${direction} on ${selectedAsset} for $${tradeAmount}`, {
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

  // Check if trading is possible
  const isPriceAvailable = !!currentPrice?.price;
  const canTrade = isPriceAvailable && isConnected;

  const handleTrade = useCallback(
    async (direction: 'UP' | 'DOWN', amount?: number, duration?: number) => {
      if (!user) return;

      // Check price availability first
      if (!isPriceAvailable) {
        toast.error('Waiting for price data. Please try again.', { duration: 3000 });
        return;
      }

      // Use provided values or fall back to state
      const tradeAmount = amount ?? selectedAmount;
      const tradeDuration = duration ?? selectedDuration;

      // Validate before placing trade
      const balance = getDemoBalance();
      if (tradeAmount > balance) {
        const shortfall = tradeAmount - balance;
        toast.error(`Insufficient balance. Need $${shortfall.toFixed(2)} more (Available: $${balance.toFixed(2)})`, { duration: 4000 });
        return;
      }
      if (tradeAmount <= 0) {
        toast.error('Invalid trade amount', { duration: 3000 });
        return;
      }

      // Show confirmation for large trades
      if (tradeAmount >= LARGE_TRADE_THRESHOLD) {
        setPendingTrade({ direction, amount: tradeAmount, duration: tradeDuration });
        return;
      }

      // Execute trade directly for smaller amounts
      await executeTrade(direction, tradeAmount, tradeDuration);
    },
    [user, selectedAmount, selectedDuration, executeTrade, isPriceAvailable]
  );

  // Handle confirmation of large trade
  const handleConfirmTrade = useCallback(() => {
    if (pendingTrade) {
      executeTrade(pendingTrade.direction, pendingTrade.amount, pendingTrade.duration);
      setPendingTrade(null);
    }
  }, [pendingTrade, executeTrade]);

  // Cancel pending trade
  const handleCancelTrade = useCallback(() => {
    setPendingTrade(null);
  }, []);

  // Keyboard shortcuts for trading
  useTradingShortcuts({
    onBuy: useCallback(() => handleTrade('UP'), [handleTrade]),
    onSell: useCallback(() => handleTrade('DOWN'), [handleTrade]),
    onAmountSelect: handleSelectAmount,
    onDurationSelect: handleDurationNav,
    amounts: QUICK_AMOUNTS,
    enabled: !!user && placingTrades.size === 0 && canTrade,
  });

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          {/* Animated Candlestick Loader */}
          <div className="flex items-end justify-center gap-1.5 h-16 mb-4">
            {/* Candle 1 - Blue */}
            <div className="flex flex-col items-center animate-[candlePulse1_1.2s_ease-in-out_infinite]">
              <div className="w-0.5 h-2 bg-blue-500/60 rounded-full" />
              <div className="w-3 h-8 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm shadow-lg shadow-blue-500/20" />
              <div className="w-0.5 h-1.5 bg-blue-500/60 rounded-full" />
            </div>
            {/* Candle 2 - Red */}
            <div className="flex flex-col items-center animate-[candlePulse2_1.2s_ease-in-out_infinite_0.15s]">
              <div className="w-0.5 h-3 bg-red-500/60 rounded-full" />
              <div className="w-3 h-6 bg-gradient-to-t from-red-600 to-red-400 rounded-sm shadow-lg shadow-red-500/20" />
              <div className="w-0.5 h-2 bg-red-500/60 rounded-full" />
            </div>
            {/* Candle 3 - Blue */}
            <div className="flex flex-col items-center animate-[candlePulse3_1.2s_ease-in-out_infinite_0.3s]">
              <div className="w-0.5 h-1.5 bg-blue-500/60 rounded-full" />
              <div className="w-3 h-10 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm shadow-lg shadow-blue-500/20" />
              <div className="w-0.5 h-2.5 bg-blue-500/60 rounded-full" />
            </div>
            {/* Candle 4 - Red */}
            <div className="flex flex-col items-center animate-[candlePulse4_1.2s_ease-in-out_infinite_0.45s]">
              <div className="w-0.5 h-2.5 bg-red-500/60 rounded-full" />
              <div className="w-3 h-5 bg-gradient-to-t from-red-600 to-red-400 rounded-sm shadow-lg shadow-red-500/20" />
              <div className="w-0.5 h-1.5 bg-red-500/60 rounded-full" />
            </div>
            {/* Candle 5 - Blue */}
            <div className="flex flex-col items-center animate-[candlePulse5_1.2s_ease-in-out_infinite_0.6s]">
              <div className="w-0.5 h-1 bg-blue-500/60 rounded-full" />
              <div className="w-3 h-12 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm shadow-lg shadow-blue-500/20" />
              <div className="w-0.5 h-2 bg-blue-500/60 rounded-full" />
            </div>
          </div>
          <p className="text-slate-400 text-sm font-medium">Loading demo trading platform...</p>
          <style jsx>{`
            @keyframes candlePulse1 {
              0%, 100% { transform: scaleY(1); opacity: 0.7; }
              50% { transform: scaleY(1.15); opacity: 1; }
            }
            @keyframes candlePulse2 {
              0%, 100% { transform: scaleY(1); opacity: 0.7; }
              50% { transform: scaleY(0.85); opacity: 1; }
            }
            @keyframes candlePulse3 {
              0%, 100% { transform: scaleY(1); opacity: 0.7; }
              50% { transform: scaleY(1.2); opacity: 1; }
            }
            @keyframes candlePulse4 {
              0%, 100% { transform: scaleY(1); opacity: 0.7; }
              50% { transform: scaleY(0.9); opacity: 1; }
            }
            @keyframes candlePulse5 {
              0%, 100% { transform: scaleY(1); opacity: 0.7; }
              50% { transform: scaleY(1.1); opacity: 1; }
            }
          `}</style>
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
      {/* Mobile: padding-bottom for trading panel, Desktop: pb-0 */}
      <div className="flex-1 flex overflow-hidden pb-[var(--mobile-trading-panel-height)] md:pb-0">
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
          amount={selectedAmount}
          onAmountChange={handleSelectAmount}
          isLoading={placingTrades.size > 0}
          isDisabled={!canTrade}
          payoutPercent={assetPayout}
          isDemoMode={true}
          showShortcuts
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
        amount={selectedAmount}
        onAmountChange={handleSelectAmount}
        isLoading={placingTrades.size > 0}
        isDisabled={!canTrade}
        payoutPercent={assetPayout}
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
        onUpdateIndicatorParams={updateIndicatorParams}
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

      {/* Large Trade Confirmation Modal */}
      <TradeConfirmModal
        isOpen={pendingTrade !== null}
        direction={pendingTrade?.direction ?? 'UP'}
        symbol={selectedAsset}
        amount={pendingTrade?.amount ?? 0}
        duration={pendingTrade?.duration ?? 0}
        payout={assetPayout}
        onConfirm={handleConfirmTrade}
        onCancel={handleCancelTrade}
      />
    </div>
  );
}
