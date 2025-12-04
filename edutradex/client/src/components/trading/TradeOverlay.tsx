'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useTradeStore, Trade } from '@/store/trade.store';
import { cn } from '@/lib/utils';

interface TradeOverlayProps {
  currentPrice?: number;
}

// Constants for chart positioning
// TradingView chart layout: header ~48px, price scale on right ~85px
const CHART_HEADER_HEIGHT = 48;
const PRICE_SCALE_WIDTH = 85;

export function TradeOverlay({ currentPrice }: TradeOverlayProps) {
  const { activeTrades } = useTradeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Group trades by similar entry price (within small tolerance)
  const groupedTrades = useMemo(() => {
    const groups: { price: number; trades: Trade[] }[] = [];
    const tolerance = 0.00002;

    activeTrades.forEach(trade => {
      const existingGroup = groups.find(g =>
        Math.abs(g.price - trade.entryPrice) < tolerance
      );

      if (existingGroup) {
        existingGroup.trades.push(trade);
      } else {
        groups.push({ price: trade.entryPrice, trades: [trade] });
      }
    });

    // Sort by price descending (higher prices at top)
    return groups.sort((a, b) => b.price - a.price);
  }, [activeTrades]);

  if (activeTrades.length === 0) {
    return null;
  }

  // Calculate price range from current price and all entry prices
  const allPrices = [
    currentPrice || 0,
    ...activeTrades.map(t => t.entryPrice)
  ].filter(p => p > 0);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  // Add padding to the price range
  const padding = Math.max(priceRange * 0.3, (currentPrice || 1) * 0.0003);
  const visibleHigh = maxPrice + padding;
  const visibleLow = minPrice - padding;
  const visibleRange = visibleHigh - visibleLow;

  // Usable chart area (excluding header and some bottom space)
  const chartAreaTop = CHART_HEADER_HEIGHT + 10;
  const chartAreaBottom = containerHeight - 30;
  const chartAreaHeight = chartAreaBottom - chartAreaTop;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      {/* Render trade markers grouped by price level */}
      {groupedTrades.map((group) => {
        // Calculate pixel position for this price level
        const priceRatio = (visibleHigh - group.price) / visibleRange;
        const yPosition = chartAreaTop + (priceRatio * chartAreaHeight);

        // Clamp to visible area
        const clampedY = Math.max(chartAreaTop + 10, Math.min(chartAreaBottom - 20, yPosition));

        return (
          <PriceLevelTrades
            key={group.price}
            trades={group.trades}
            entryPrice={group.price}
            currentPrice={currentPrice || 0}
            yPosition={clampedY}
          />
        );
      })}

      {/* Current price indicator line (for reference) */}
      {currentPrice && currentPrice > 0 && (
        <CurrentPriceLine
          price={currentPrice}
          visibleHigh={visibleHigh}
          visibleRange={visibleRange}
          chartAreaTop={chartAreaTop}
          chartAreaHeight={chartAreaHeight}
        />
      )}
    </div>
  );
}

interface CurrentPriceLineProps {
  price: number;
  visibleHigh: number;
  visibleRange: number;
  chartAreaTop: number;
  chartAreaHeight: number;
}

function CurrentPriceLine({ price, visibleHigh, visibleRange, chartAreaTop, chartAreaHeight }: CurrentPriceLineProps) {
  const priceRatio = (visibleHigh - price) / visibleRange;
  const yPosition = chartAreaTop + (priceRatio * chartAreaHeight);

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none"
      style={{ top: yPosition, transform: 'translateY(-50%)' }}
    >
      <div className="flex-1 h-[1px] bg-blue-500/30" />
    </div>
  );
}

interface PriceLevelTradesProps {
  trades: Trade[];
  entryPrice: number;
  currentPrice: number;
  yPosition: number;
}

function PriceLevelTrades({ trades, entryPrice, currentPrice, yPosition }: PriceLevelTradesProps) {
  // Determine dominant direction for this price level
  const upTrades = trades.filter(t => t.direction === 'UP');
  const downTrades = trades.filter(t => t.direction === 'DOWN');
  const dominantDirection = upTrades.length >= downTrades.length ? 'UP' : 'DOWN';
  const isUp = dominantDirection === 'UP';

  return (
    <div
      className="absolute left-0 flex items-center"
      style={{
        top: yPosition,
        transform: 'translateY(-50%)',
        right: PRICE_SCALE_WIDTH,
      }}
    >
      {/* Trade markers - arranged horizontally */}
      <div className="flex items-center gap-0.5 z-10 ml-1">
        {trades.map((trade) => (
          <TradeMarker
            key={trade.id}
            trade={trade}
            currentPrice={currentPrice}
          />
        ))}
      </div>

      {/* Horizontal line to price scale */}
      <div
        className={cn(
          'flex-1 h-[2px] mx-1',
          isUp ? 'bg-emerald-500/60' : 'bg-red-500/60'
        )}
        style={{ minWidth: '20px' }}
      />

      {/* Small dot at the end */}
      <div
        className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          isUp ? 'bg-emerald-500' : 'bg-red-500'
        )}
      />
    </div>
  );
}

interface TradeMarkerProps {
  trade: Trade;
  currentPrice: number;
}

function TradeMarker({ trade, currentPrice }: TradeMarkerProps) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const expiresAt = new Date(trade.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(Math.ceil(remaining / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [trade.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const isUp = trade.direction === 'UP';

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded shadow-lg',
        'border-l-[3px]',
        isUp
          ? 'bg-emerald-600 border-emerald-300'
          : 'bg-red-600 border-red-300'
      )}
    >
      {/* Direction Arrow */}
      <div className={cn(
        'flex items-center justify-center flex-shrink-0'
      )}>
        {isUp ? (
          <ArrowUp className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-white" strokeWidth={3} />
        )}
      </div>

      {/* Amount */}
      <span className="text-white text-xs font-bold">
        ${trade.amount}
      </span>

      {/* Timer in pill */}
      <span className={cn(
        'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded',
        isUp ? 'bg-emerald-700 text-emerald-100' : 'bg-red-700 text-red-100'
      )}>
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
