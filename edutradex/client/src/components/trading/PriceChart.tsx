'use client';

import { useEffect, useRef, memo, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
} from 'lightweight-charts';
import { PriceTick } from '@/lib/api';

interface PriceChartProps {
  symbol: string;
  currentPrice: PriceTick | null;
  priceHistory: PriceTick[];
}

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface TimeframeOption {
  label: string;
  seconds: number;
}

const TIMEFRAMES: TimeframeOption[] = [
  { label: '5s', seconds: 5 },
  { label: '10s', seconds: 10 },
  { label: '30s', seconds: 30 },
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
];

// Generate realistic synthetic history centered around the current price
function generateInitialHistory(currentPrice: number, interval: number, count: number = 100): CandleData[] {
  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Align to interval boundary
  const alignedNow = Math.floor(now / interval) * interval;

  // Calculate appropriate volatility based on price and timeframe
  // Forex pairs typically move 0.01-0.05% per minute
  const baseVolatilityPercent = 0.0001; // 0.01% base
  const timeframeMultiplier = Math.sqrt(interval / 60); // Scale with square root of time
  const volatility = currentPrice * baseVolatilityPercent * timeframeMultiplier;

  // Start at current price and work backwards
  let price = currentPrice;
  const tempCandles: CandleData[] = [];

  for (let i = 0; i < count; i++) {
    const time = (alignedNow - i * interval) as Time;

    // Random walk backwards from current price
    const change = (Math.random() - 0.5) * volatility * 2;
    const close = price;
    const open = price - change;

    // Create realistic wicks (typically 20-50% of body size)
    const body = Math.abs(close - open);
    const wickMultiplier = 0.2 + Math.random() * 0.3;
    const upperWick = Math.random() * body * wickMultiplier + volatility * 0.1;
    const lowerWick = Math.random() * body * wickMultiplier + volatility * 0.1;

    const high = Math.max(open, close) + upperWick;
    const low = Math.min(open, close) - lowerWick;

    tempCandles.unshift({
      time,
      open: Number(open.toFixed(6)),
      high: Number(high.toFixed(6)),
      low: Number(low.toFixed(6)),
      close: Number(close.toFixed(6)),
    });

    price = open; // Move backwards
  }

  // Ensure the last candle ends at current price
  if (tempCandles.length > 0) {
    const lastCandle = tempCandles[tempCandles.length - 1];
    lastCandle.close = currentPrice;
    if (lastCandle.high < currentPrice) lastCandle.high = currentPrice;
    if (lastCandle.low > currentPrice) lastCandle.low = currentPrice;
  }

  return tempCandles;
}

// Format price with appropriate decimal places
function formatPrice(price: number): string {
  if (price > 1000) return price.toFixed(2);
  if (price > 100) return price.toFixed(3);
  if (price > 1) return price.toFixed(5);
  return price.toFixed(6);
}

function PriceChartComponent({ symbol, currentPrice }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | any>(null);
  const currentCandleRef = useRef<CandleData | null>(null);
  const lastCandleTimeRef = useRef<number>(0);
  const initializedKeyRef = useRef<string | null>(null);
  const lastPriceRef = useRef<number>(0);

  // Timeframe state
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(TIMEFRAMES[3]); // Default to 1m
  const candleInterval = selectedTimeframe.seconds;

  // Convert timestamp to candle time bucket
  const getCandleTime = useCallback((timestamp: string | Date): number => {
    const time = new Date(timestamp).getTime() / 1000;
    return Math.floor(time / candleInterval) * candleInterval;
  }, [candleInterval]);

  // Initialize chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f0f1a' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e1e2e', style: 1 },
        horzLines: { color: '#1e1e2e', style: 1 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          width: 1,
          color: '#4b5563',
          style: 2,
          labelBackgroundColor: '#374151',
        },
        horzLine: {
          width: 1,
          color: '#4b5563',
          style: 2,
          labelBackgroundColor: '#374151',
        },
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
        autoScale: true,
        mode: 0,
        ticksVisible: true,
      },
      localization: {
        priceFormatter: (price: number) => formatPrice(price),
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 4,
        rightOffset: 10,
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 5,
        minMove: 0.00001,
      },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      candlestickSeriesRef.current = null;
      currentCandleRef.current = null;
      lastCandleTimeRef.current = 0;
    };
  }, []);

  // Reset when symbol or timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    candlestickSeriesRef.current.setData([]);
    currentCandleRef.current = null;
    lastCandleTimeRef.current = 0;
    initializedKeyRef.current = null;
    lastPriceRef.current = 0;
  }, [symbol, candleInterval]);

  // Handle real-time price updates
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice || !chartRef.current) return;

    const price = currentPrice.price;
    const candleTime = getCandleTime(currentPrice.timestamp);
    const initKey = `${symbol}-${candleInterval}`;

    // Initialize chart with synthetic history on first price or when settings change
    if (initializedKeyRef.current !== initKey) {
      const initialCandles = generateInitialHistory(price, candleInterval, 100);
      candlestickSeriesRef.current.setData(initialCandles);

      const lastCandle = initialCandles[initialCandles.length - 1];
      currentCandleRef.current = { ...lastCandle };
      lastCandleTimeRef.current = lastCandle.time as number;
      initializedKeyRef.current = initKey;
      lastPriceRef.current = price;

      // Scroll to show recent candles
      chartRef.current.timeScale().scrollToRealTime();
      return;
    }

    // Sanity check: if price jumped too much (>5%), likely a data issue - reinitialize
    if (lastPriceRef.current > 0) {
      const priceChange = Math.abs(price - lastPriceRef.current) / lastPriceRef.current;
      if (priceChange > 0.05) {
        // Price jumped more than 5% - reinitialize chart
        initializedKeyRef.current = null;
        return;
      }
    }

    // Create or update candle
    if (candleTime > lastCandleTimeRef.current) {
      // New candle - use previous close as open for continuity
      const prevClose = currentCandleRef.current?.close ?? price;
      const newCandle: CandleData = {
        time: candleTime as Time,
        open: prevClose,
        high: Math.max(prevClose, price),
        low: Math.min(prevClose, price),
        close: price,
      };

      currentCandleRef.current = newCandle;
      lastCandleTimeRef.current = candleTime;
      candlestickSeriesRef.current.update(newCandle);
    } else if (currentCandleRef.current) {
      // Update existing candle
      currentCandleRef.current.high = Math.max(currentCandleRef.current.high, price);
      currentCandleRef.current.low = Math.min(currentCandleRef.current.low, price);
      currentCandleRef.current.close = price;
      candlestickSeriesRef.current.update(currentCandleRef.current);
    }

    lastPriceRef.current = price;
  }, [currentPrice, getCandleTime, symbol, candleInterval]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f1a] relative">
      {/* Timeframe Selector */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#1a1a2e]/90 backdrop-blur-sm rounded-lg p-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.label}
            onClick={() => setSelectedTimeframe(tf)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              selectedTimeframe.label === tf.label
                ? 'bg-emerald-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#252542]'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="flex-1 w-full" />

      {/* Loading State */}
      {!currentPrice && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f1a]">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-2 text-gray-400 text-sm">Connecting to {symbol}...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export const PriceChart = memo(PriceChartComponent);
