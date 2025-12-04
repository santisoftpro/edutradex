'use client';

import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { TradingHeader } from '@/components/trading/TradingHeader';
import { TradingPanel } from '@/components/trading/TradingPanel';
import { PriceChart } from '@/components/trading/PriceChart';
import { ActiveTrades } from '@/components/trading/ActiveTrades';
import { TradesSidebar } from '@/components/trading/TradesSidebar';
import { RightMenu } from '@/components/trading/RightMenu';
import { MobileNav } from '@/components/trading/MobileNav';
import { MobileTradesSheet } from '@/components/trading/MobileTradesSheet';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore } from '@/store/trade.store';
import { useWebSocket } from '@/hooks/useWebSocket';
import { api, PriceTick } from '@/lib/api';
import { playBuySound, playSellSound, playWinSound, playLoseSound } from '@/lib/sounds';

export default function TradePage() {
  const { user, syncBalanceFromServer, isHydrated } = useAuthStore();
  const { placeTrade, syncFromApi, isLoading } = useTradeStore();
  const { isConnected, latestPrices, priceHistory, subscribe, unsubscribe } = useWebSocket();
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [isTrading, setIsTrading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<PriceTick | null>(null);
  const [isTradesPanelOpen, setIsTradesPanelOpen] = useState(true);
  const [isMobileTradesOpen, setIsMobileTradesOpen] = useState(false);

  useEffect(() => {
    if (isHydrated && user) {
      // Sync balance and trades from server when page loads
      syncBalanceFromServer();
      syncFromApi();
    }
  }, [isHydrated, user, syncBalanceFromServer, syncFromApi]);

  // Subscribe to selected asset's price updates via WebSocket
  useEffect(() => {
    if (isConnected) {
      subscribe(selectedAsset);

      return () => {
        unsubscribe(selectedAsset);
      };
    }
  }, [selectedAsset, isConnected, subscribe, unsubscribe]);

  // Update current price from WebSocket
  useEffect(() => {
    const price = latestPrices.get(selectedAsset);
    if (price) {
      setCurrentPrice(price);
    }
  }, [latestPrices, selectedAsset]);

  const getMarketType = (symbol: string) => {
    if (symbol.startsWith('OTC') || symbol.startsWith('VOL')) {
      return 'otc' as const;
    }
    return 'forex' as const;
  };

  const handleTrade = useCallback(
    async (direction: 'UP' | 'DOWN', amount: number, duration: number) => {
      if (!user) return;

      setIsTrading(true);

      // Play sound based on direction
      if (direction === 'UP') {
        playBuySound();
      } else {
        playSellSound();
      }

      try {
        const priceData = await api.getCurrentPrice(selectedAsset);
        const entryPrice = priceData?.price || currentPrice?.price || 1.0852;
        const marketType = getMarketType(selectedAsset);

        const trade = await placeTrade({
          symbol: selectedAsset,
          direction,
          amount,
          duration,
          entryPrice,
          marketType,
        });

        // Sync balance from server after trade is placed (server deducted the amount)
        await syncBalanceFromServer();

        toast.success(`Trade placed: ${direction} on ${selectedAsset} for $${amount}`, {
          duration: 3000,
        });

        const pollResult = async () => {
          const updatedTrade = await api.getTradeById(trade.id);
          if (updatedTrade && updatedTrade.status === 'CLOSED') {
            const won = updatedTrade.result === 'WON';
            const profit = updatedTrade.profit || 0;

            if (won) {
              playWinSound();
              toast.success(`Profit! +$${profit.toFixed(2)}`, {
                duration: 4000,
              });
            } else {
              playLoseSound();
              toast.error(`Loss! -$${amount.toFixed(2)}`, {
                duration: 4000,
              });
            }

            // Always sync balance from server after trade closes - server is source of truth
            await syncBalanceFromServer();
            syncFromApi();
          } else {
            setTimeout(pollResult, 1000);
          }
        };

        setTimeout(pollResult, duration * 1000 + 500);
      } catch (error) {
        console.error('Trade failed:', error);
        toast.error('Failed to place trade. Please try again.', {
          duration: 4000,
        });
      } finally {
        setIsTrading(false);
      }
    },
    [user, selectedAsset, currentPrice, syncBalanceFromServer, placeTrade, syncFromApi]
  );

  // Show loading while user data is being fetched from server
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
    <div className="fixed inset-0 flex flex-col bg-[#0f0f1a] overflow-hidden">
      <TradingHeader
        selectedAsset={selectedAsset}
        onSelectAsset={setSelectedAsset}
        currentPrice={currentPrice}
      />

      {/* Mobile Navigation Bar - below header */}
      <MobileNav onOpenTrades={() => setIsMobileTradesOpen(true)} />

      {/* Main Content - Chart takes remaining space, minus bottom panel on mobile */}
      {/* pt-[44px] on mobile for MobileNav, pb-[76px] for trading panel */}
      <div className="flex-1 flex overflow-hidden pt-[44px] md:pt-0 pb-[76px] md:pb-0">
        {/* Chart Area - Full width on mobile */}
        <div className="flex-1 h-full relative overflow-hidden">
          <PriceChart
            symbol={selectedAsset}
            currentPrice={currentPrice}
            priceHistory={priceHistory.get(selectedAsset) || []}
          />
          {/* Active Trades - Visible on all screens */}
          <ActiveTrades />
        </div>

        {/* Trading Panel - Desktop only sidebar, Mobile shows bottom sheet */}
        <TradingPanel
          balance={user.demoBalance}
          onTrade={handleTrade}
          isLoading={isTrading || isLoading}
          currentPrice={currentPrice?.price}
          isTradesPanelOpen={isTradesPanelOpen}
        />

        {/* Trades Sidebar - Large screens only, controlled by RightMenu */}
        {isTradesPanelOpen && (
          <TradesSidebar
            isCollapsed={false}
            onToggle={() => setIsTradesPanelOpen(false)}
          />
        )}
      </div>

      {/* Fixed Right Menu - Icon navigation (desktop only) */}
      <RightMenu
        isTradesPanelOpen={isTradesPanelOpen}
        onToggleTradesPanel={() => setIsTradesPanelOpen(!isTradesPanelOpen)}
      />

      {/* Mobile Trades Sheet */}
      <MobileTradesSheet
        isOpen={isMobileTradesOpen}
        onClose={() => setIsMobileTradesOpen(false)}
      />
    </div>
  );
}
