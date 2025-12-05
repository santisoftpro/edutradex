'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TradingHeader } from '@/components/trading/TradingHeader';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { PriceChart } from '@/components/trading/PriceChart';
import { ActiveTrades } from '@/components/trading/ActiveTrades';
import { TradesSidebar } from '@/components/trading/TradesSidebar';
import { RightMenu } from '@/components/trading/RightMenu';
import { Header } from '@/components/layout/Header';
import { MobileAssetBar } from '@/components/trading/MobileAssetBar';
import { MobileTradingPanel } from '@/components/trading/MobileTradingPanel';
import { MobileNav } from '@/components/trading/MobileNav';
import { MobileTradesSheet } from '@/components/trading/MobileTradesSheet';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore } from '@/store/trade.store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { PriceTick } from '@/lib/api';
import { playBuySound, playSellSound } from '@/lib/sounds';

export default function TradePage() {
  const { user, syncBalanceFromServer, isHydrated } = useAuthStore();
  const { placeTrade, syncFromApi } = useTradeStore();
  const { isConnected, latestPrices, priceHistory, subscribe, unsubscribe } = useWebSocket();
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [currentPrice, setCurrentPrice] = useState<PriceTick | null>(null);
  const [isTradesPanelOpen, setIsTradesPanelOpen] = useState(true);
  const [isMobileTradesOpen, setIsMobileTradesOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(300);

  useEffect(() => {
    if (isHydrated && user) {
      syncBalanceFromServer();
      syncFromApi();
    }
  }, [isHydrated, user, syncBalanceFromServer, syncFromApi]);

  useEffect(() => {
    if (isConnected) {
      subscribe(selectedAsset);
      return () => {
        unsubscribe(selectedAsset);
      };
    }
  }, [selectedAsset, isConnected, subscribe, unsubscribe]);

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

      // Play sound immediately for instant feedback
      if (direction === 'UP') {
        playBuySound();
      } else {
        playSellSound();
      }

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

        toast.success(`Trade placed: ${direction} on ${selectedAsset} for $${amount}`, {
          duration: 3000,
        });

        // Sync balance in background (don't block next trade)
        syncBalanceFromServer();
      } catch (error) {
        console.error('Trade failed:', error);
        toast.error('Failed to place trade. Please try again.', {
          duration: 4000,
        });
      }
    },
    [user, selectedAsset, currentPrice, syncBalanceFromServer, placeTrade]
  );

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f1a]">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
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
          onSelectAsset={setSelectedAsset}
          currentPrice={currentPrice}
        />
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      {/* Mobile Header - Same as other pages */}
      <div className="md:hidden">
        <Header />
      </div>

      {/* Mobile Asset Bar */}
      <MobileAssetBar
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        currentPrice={currentPrice}
        expirationTime={selectedDuration}
      />

      {/* ===== MAIN CONTENT AREA ===== */}
      {/* Mobile: pb-[250px] for trading panel (~180px) + nav (~70px) */}
      {/* Desktop: pb-0 */}
      <div className="flex-1 flex overflow-hidden pb-[250px] md:pb-0">
        {/* Chart Area */}
        <div className="flex-1 h-full relative overflow-hidden">
          <PriceChart
            symbol={selectedAsset}
            currentPrice={currentPrice}
            priceHistory={priceHistory.get(selectedAsset) || []}
          />
          <ActiveTrades />
        </div>

        {/* Desktop Trading Panel */}
        <TradingPanel
          balance={user.demoBalance}
          onTrade={handleTrade}
          currentPrice={currentPrice?.price}
          isTradesPanelOpen={isTradesPanelOpen}
        />

        {/* Desktop Trades Sidebar */}
        {isTradesPanelOpen && (
          <TradesSidebar
            isCollapsed={false}
            onToggle={() => setIsTradesPanelOpen(false)}
          />
        )}
      </div>

      {/* Desktop Right Menu */}
      <RightMenu
        isTradesPanelOpen={isTradesPanelOpen}
        onToggleTradesPanel={() => setIsTradesPanelOpen(!isTradesPanelOpen)}
      />

      {/* ===== MOBILE FIXED BOTTOM ELEMENTS ===== */}
      {/* Mobile Trading Panel - positioned above nav */}
      <MobileTradingPanel
        balance={user.demoBalance}
        onTrade={handleTrade}
        onDurationChange={setSelectedDuration}
      />

      {/* Mobile Bottom Navigation - at very bottom */}
      <MobileNav onOpenTrades={() => setIsMobileTradesOpen(true)} />

      {/* Mobile Trades Sheet */}
      <MobileTradesSheet
        isOpen={isMobileTradesOpen}
        onClose={() => setIsMobileTradesOpen(false)}
      />
    </div>
  );
}
