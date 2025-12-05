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
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { ChevronDown, BarChart3, X, Check } from 'lucide-react';
import { PriceTick } from '@/lib/api';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  CandleData as IndicatorCandleData,
} from '@/lib/indicators';

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

interface IndicatorConfig {
  id: string;
  name: string;
  type: 'overlay' | 'panel';
  enabled: boolean;
  color?: string;
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

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma20', name: 'SMA (20)', type: 'overlay', enabled: false, color: '#f59e0b' },
  { id: 'ema9', name: 'EMA (9)', type: 'overlay', enabled: false, color: '#8b5cf6' },
  { id: 'ema21', name: 'EMA (21)', type: 'overlay', enabled: false, color: '#06b6d4' },
  { id: 'bollinger', name: 'Bollinger Bands', type: 'overlay', enabled: false, color: '#6366f1' },
  { id: 'rsi', name: 'RSI (14)', type: 'panel', enabled: false, color: '#f59e0b' },
  { id: 'macd', name: 'MACD', type: 'panel', enabled: false, color: '#22c55e' },
];

function generateInitialHistory(currentPrice: number, interval: number, count: number = 100): CandleData[] {
  const candles: CandleData[] = [];
  const now = Math.floor(Date.now() / 1000);
  const alignedNow = Math.floor(now / interval) * interval;

  const baseVolatilityPercent = 0.0001;
  const timeframeMultiplier = Math.sqrt(interval / 60);
  const volatility = currentPrice * baseVolatilityPercent * timeframeMultiplier;

  let price = currentPrice;
  const tempCandles: CandleData[] = [];

  for (let i = 0; i < count; i++) {
    const time = (alignedNow - i * interval) as Time;
    const change = (Math.random() - 0.5) * volatility * 2;
    const close = price;
    const open = price - change;

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

    price = open;
  }

  if (tempCandles.length > 0) {
    const lastCandle = tempCandles[tempCandles.length - 1];
    lastCandle.close = currentPrice;
    if (lastCandle.high < currentPrice) lastCandle.high = currentPrice;
    if (lastCandle.low > currentPrice) lastCandle.low = currentPrice;
  }

  return tempCandles;
}

function formatPrice(price: number): string {
  if (price > 1000) return price.toFixed(2);
  if (price > 100) return price.toFixed(3);
  if (price > 1) return price.toFixed(5);
  return price.toFixed(6);
}

function PriceChartComponent({ symbol, currentPrice }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'> | any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const macdSeriesRef = useRef<{ macd: ISeriesApi<'Line'>; signal: ISeriesApi<'Line'>; histogram: ISeriesApi<'Histogram'> } | any>(null);

  const currentCandleRef = useRef<CandleData | null>(null);
  const candlesRef = useRef<CandleData[]>([]);
  const lastCandleTimeRef = useRef<number>(0);
  const initializedKeyRef = useRef<string | null>(null);
  const lastPriceRef = useRef<number>(0);

  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeOption>(TIMEFRAMES[3]);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const [showMobileIndicatorSheet, setShowMobileIndicatorSheet] = useState(false);

  const candleInterval = selectedTimeframe.seconds;

  const hasRSI = indicators.find((i) => i.id === 'rsi')?.enabled;
  const hasMACD = indicators.find((i) => i.id === 'macd')?.enabled;
  const activeIndicatorCount = indicators.filter((i) => i.enabled).length;

  const getCandleTime = useCallback(
    (timestamp: string | Date): number => {
      const time = new Date(timestamp).getTime() / 1000;
      return Math.floor(time / candleInterval) * candleInterval;
    },
    [candleInterval]
  );

  const toggleIndicator = (id: string) => {
    setIndicators((prev) =>
      prev.map((ind) => (ind.id === id ? { ...ind, enabled: !ind.enabled } : ind))
    );
  };

  // Convert CandleData to IndicatorCandleData format
  const toIndicatorFormat = (candles: CandleData[]): IndicatorCandleData[] => {
    return candles.map((c) => ({
      time: c.time as number,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  };

  // Update all indicator series
  const updateIndicators = useCallback(
    (candles: CandleData[]) => {
      if (candles.length < 30) return;

      const indicatorData = toIndicatorFormat(candles);

      indicators.forEach((indicator) => {
        if (!indicator.enabled) return;

        if (indicator.id === 'sma20') {
          const smaData = calculateSMA(indicatorData, 20);
          const series = indicatorSeriesRef.current.get('sma20');
          if (series && smaData.length > 0) {
            series.setData(smaData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        if (indicator.id === 'ema9') {
          const emaData = calculateEMA(indicatorData, 9);
          const series = indicatorSeriesRef.current.get('ema9');
          if (series && emaData.length > 0) {
            series.setData(emaData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        if (indicator.id === 'ema21') {
          const emaData = calculateEMA(indicatorData, 21);
          const series = indicatorSeriesRef.current.get('ema21');
          if (series && emaData.length > 0) {
            series.setData(emaData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        if (indicator.id === 'bollinger') {
          const bbData = calculateBollingerBands(indicatorData, 20, 2);
          const upperSeries = indicatorSeriesRef.current.get('bollinger_upper');
          const middleSeries = indicatorSeriesRef.current.get('bollinger_middle');
          const lowerSeries = indicatorSeriesRef.current.get('bollinger_lower');

          if (upperSeries && bbData.length > 0) {
            upperSeries.setData(bbData.map((d) => ({ time: d.time as Time, value: d.upper })));
          }
          if (middleSeries && bbData.length > 0) {
            middleSeries.setData(bbData.map((d) => ({ time: d.time as Time, value: d.middle })));
          }
          if (lowerSeries && bbData.length > 0) {
            lowerSeries.setData(bbData.map((d) => ({ time: d.time as Time, value: d.lower })));
          }
        }

        if (indicator.id === 'rsi' && rsiSeriesRef.current) {
          const rsiData = calculateRSI(indicatorData, 14);
          if (rsiData.length > 0) {
            rsiSeriesRef.current.setData(
              rsiData.map((d) => ({ time: d.time as Time, value: d.value }))
            );
          }
        }

        if (indicator.id === 'macd' && macdSeriesRef.current) {
          const macdData = calculateMACD(indicatorData, 12, 26, 9);
          if (macdData.length > 0) {
            macdSeriesRef.current.macd.setData(
              macdData.map((d) => ({ time: d.time as Time, value: d.macd }))
            );
            macdSeriesRef.current.signal.setData(
              macdData.map((d) => ({ time: d.time as Time, value: d.signal }))
            );
            macdSeriesRef.current.histogram.setData(
              macdData.map((d) => ({
                time: d.time as Time,
                value: d.histogram,
                color: d.histogram >= 0 ? '#22c55e' : '#ef4444',
              }))
            );
          }
        }
      });
    },
    [indicators]
  );

  // Initialize main chart
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
        vertLine: { width: 1, color: '#4b5563', style: 2, labelBackgroundColor: '#374151' },
        horzLine: { width: 1, color: '#4b5563', style: 2, labelBackgroundColor: '#374151' },
      },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
        mode: 0,
        ticksVisible: true,
      },
      localization: { priceFormatter: (price: number) => formatPrice(price) },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 4,
        rightOffset: 10,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

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
      indicatorSeriesRef.current.clear();
      currentCandleRef.current = null;
      candlesRef.current = [];
      lastCandleTimeRef.current = 0;
    };
  }, []);

  // Create/remove overlay indicator series based on selection
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;

    indicators.forEach((indicator) => {
      if (indicator.type !== 'overlay') return;

      if (indicator.id === 'bollinger') {
        const upperKey = 'bollinger_upper';
        const middleKey = 'bollinger_middle';
        const lowerKey = 'bollinger_lower';

        if (indicator.enabled) {
          if (!indicatorSeriesRef.current.has(upperKey)) {
            const upper = chart.addSeries(LineSeries, {
              color: '#6366f1',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            const middle = chart.addSeries(LineSeries, {
              color: '#6366f1',
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            const lower = chart.addSeries(LineSeries, {
              color: '#6366f1',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorSeriesRef.current.set(upperKey, upper);
            indicatorSeriesRef.current.set(middleKey, middle);
            indicatorSeriesRef.current.set(lowerKey, lower);
          }
        } else {
          [upperKey, middleKey, lowerKey].forEach((key) => {
            const series = indicatorSeriesRef.current.get(key);
            if (series) {
              chart.removeSeries(series);
              indicatorSeriesRef.current.delete(key);
            }
          });
        }
      } else {
        if (indicator.enabled) {
          if (!indicatorSeriesRef.current.has(indicator.id)) {
            const series = chart.addSeries(LineSeries, {
              color: indicator.color || '#f59e0b',
              lineWidth: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorSeriesRef.current.set(indicator.id, series);
          }
        } else {
          const series = indicatorSeriesRef.current.get(indicator.id);
          if (series) {
            chart.removeSeries(series);
            indicatorSeriesRef.current.delete(indicator.id);
          }
        }
      }
    });

    // Update indicators with current data
    if (candlesRef.current.length > 0) {
      updateIndicators(candlesRef.current);
    }
  }, [indicators, updateIndicators]);

  // Initialize RSI chart
  useEffect(() => {
    if (!hasRSI || !rsiContainerRef.current) {
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
      return;
    }

    const chart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f0f1a' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e1e2e', style: 1 },
        horzLines: { color: '#1e1e2e', style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: false,
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
        visible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chart.priceScale('right').applyOptions({
      autoScale: false,
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      priceLineVisible: false,
    });

    // Add RSI levels (30 and 70)
    rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineWidth: 1, lineStyle: 2 });
    rsiSeries.createPriceLine({ price: 30, color: '#22c55e', lineWidth: 1, lineStyle: 2 });
    rsiSeries.createPriceLine({ price: 50, color: '#6b7280', lineWidth: 1, lineStyle: 2 });

    rsiChartRef.current = chart;
    rsiSeriesRef.current = rsiSeries;

    // Sync time scale with main chart
    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && rsiChartRef.current) {
          rsiChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const handleResize = () => {
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({
          width: rsiContainerRef.current.clientWidth,
          height: rsiContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(rsiContainerRef.current);
    handleResize();

    // Update with current data
    if (candlesRef.current.length > 0) {
      updateIndicators(candlesRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
        rsiSeriesRef.current = null;
      }
    };
  }, [hasRSI, updateIndicators]);

  // Initialize MACD chart
  useEffect(() => {
    if (!hasMACD || !macdContainerRef.current) {
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdSeriesRef.current = null;
      }
      return;
    }

    const chart = createChart(macdContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0f0f1a' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#1e1e2e', style: 1 },
        horzLines: { color: '#1e1e2e', style: 1 },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: '#2d2d44',
        scaleMargins: { top: 0.2, bottom: 0.2 },
        autoScale: true,
      },
      timeScale: {
        borderColor: '#2d2d44',
        timeVisible: true,
        secondsVisible: false,
        visible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const histogramSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
    });

    const macdLineSeries = chart.addSeries(LineSeries, {
      color: '#22c55e',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const signalLineSeries = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 2,
      priceLineVisible: false,
    });

    macdChartRef.current = chart;
    macdSeriesRef.current = {
      macd: macdLineSeries,
      signal: signalLineSeries,
      histogram: histogramSeries,
    };

    // Sync time scale with main chart
    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && macdChartRef.current) {
          macdChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const handleResize = () => {
      if (macdContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({
          width: macdContainerRef.current.clientWidth,
          height: macdContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(macdContainerRef.current);
    handleResize();

    // Update with current data
    if (candlesRef.current.length > 0) {
      updateIndicators(candlesRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (macdChartRef.current) {
        macdChartRef.current.remove();
        macdChartRef.current = null;
        macdSeriesRef.current = null;
      }
    };
  }, [hasMACD, updateIndicators]);

  // Reset when symbol or timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    candlestickSeriesRef.current.setData([]);
    currentCandleRef.current = null;
    candlesRef.current = [];
    lastCandleTimeRef.current = 0;
    initializedKeyRef.current = null;
    lastPriceRef.current = 0;

    // Clear indicator data
    indicatorSeriesRef.current.forEach((series) => {
      series.setData([]);
    });
    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData([]);
    }
    if (macdSeriesRef.current) {
      macdSeriesRef.current.macd.setData([]);
      macdSeriesRef.current.signal.setData([]);
      macdSeriesRef.current.histogram.setData([]);
    }
  }, [symbol, candleInterval]);

  // Handle real-time price updates
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice || !chartRef.current) return;

    const price = currentPrice.price;
    const candleTime = getCandleTime(currentPrice.timestamp);
    const initKey = `${symbol}-${candleInterval}`;

    if (initializedKeyRef.current !== initKey) {
      const initialCandles = generateInitialHistory(price, candleInterval, 100);
      candlestickSeriesRef.current.setData(initialCandles);
      candlesRef.current = initialCandles;

      const lastCandle = initialCandles[initialCandles.length - 1];
      currentCandleRef.current = { ...lastCandle };
      lastCandleTimeRef.current = lastCandle.time as number;
      initializedKeyRef.current = initKey;
      lastPriceRef.current = price;

      chartRef.current.timeScale().scrollToRealTime();

      // Update indicators with initial data
      updateIndicators(initialCandles);
      return;
    }

    if (lastPriceRef.current > 0) {
      const priceChange = Math.abs(price - lastPriceRef.current) / lastPriceRef.current;
      if (priceChange > 0.05) {
        initializedKeyRef.current = null;
        return;
      }
    }

    if (candleTime > lastCandleTimeRef.current) {
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

      // Add to candles array and update indicators
      candlesRef.current = [...candlesRef.current.slice(-99), newCandle];
      updateIndicators(candlesRef.current);
    } else if (currentCandleRef.current) {
      currentCandleRef.current.high = Math.max(currentCandleRef.current.high, price);
      currentCandleRef.current.low = Math.min(currentCandleRef.current.low, price);
      currentCandleRef.current.close = price;
      candlestickSeriesRef.current.update(currentCandleRef.current);

      // Update last candle in array
      if (candlesRef.current.length > 0) {
        candlesRef.current[candlesRef.current.length - 1] = { ...currentCandleRef.current };
      }
    }

    lastPriceRef.current = price;
  }, [currentPrice, getCandleTime, symbol, candleInterval, updateIndicators]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f1a] relative">
      {/* Mobile Controls - Top Left */}
      <div className="md:hidden absolute top-2 left-2 z-10 flex items-center gap-2">
        {/* Timeframe Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
            className="flex items-center gap-1 px-3 py-2 bg-[#1a1a2e] border border-[#3d3d5c] rounded-lg text-white text-sm font-medium"
          >
            {selectedTimeframe.label}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showTimeframeMenu && (
            <>
              <div className="fixed inset-0 z-[15]" onClick={() => setShowTimeframeMenu(false)} />
              <div className="absolute top-full left-0 mt-1 w-24 bg-[#1a1a2e] border border-[#3d3d5c] rounded-lg shadow-xl z-20 overflow-hidden">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.label}
                    onClick={() => {
                      setSelectedTimeframe(tf);
                      setShowTimeframeMenu(false);
                    }}
                    className={`w-full px-3 py-2.5 text-sm text-left transition-colors ${selectedTimeframe.label === tf.label ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:bg-[#252542]'}`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Indicator Button */}
        <button
          onClick={() => setShowMobileIndicatorSheet(true)}
          className="relative flex items-center justify-center w-10 h-10 bg-[#1a1a2e] border border-[#3d3d5c] rounded-lg"
        >
          <BarChart3 className="h-5 w-5 text-gray-400" />
          {activeIndicatorCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
              {activeIndicatorCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Indicator Bottom Sheet */}
      {showMobileIndicatorSheet && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-[55]"
            onClick={() => setShowMobileIndicatorSheet(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-2xl z-[60] max-h-[70vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2d2d44]">
              <h3 className="text-white font-semibold text-lg">Indicators</h3>
              <button
                onClick={() => setShowMobileIndicatorSheet(false)}
                className="p-2 -mr-2 text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
              <div className="p-3 border-b border-[#2d2d44]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overlays</span>
              </div>
              {indicators
                .filter((i) => i.type === 'overlay')
                .map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className="w-full flex items-center justify-between px-4 py-4 border-b border-[#2d2d44]/50 active:bg-[#252542]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: indicator.color }} />
                      <span className="text-white text-base">{indicator.name}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      {indicator.enabled && <Check className="h-4 w-4 text-emerald-400" />}
                    </div>
                  </button>
                ))}

              <div className="p-3 border-b border-[#2d2d44]">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Oscillators</span>
              </div>
              {indicators
                .filter((i) => i.type === 'panel')
                .map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className="w-full flex items-center justify-between px-4 py-4 border-b border-[#2d2d44]/50 active:bg-[#252542]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded-full" style={{ backgroundColor: indicator.color }} />
                      <span className="text-white text-base">{indicator.name}</span>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      {indicator.enabled && <Check className="h-4 w-4 text-emerald-400" />}
                    </div>
                  </button>
                ))}
              <div className="h-6" />
            </div>
          </div>
        </>
      )}

      {/* Desktop Controls - Top Left */}
      <div className="hidden md:flex absolute top-2 left-2 z-10 items-center gap-2">
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-[#1a1a2e]/90 backdrop-blur-sm rounded-lg p-1">
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

        {/* Indicator Button */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#1a1a2e]/90 backdrop-blur-sm rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-[#252542] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Indicators
            {indicators.filter((i) => i.enabled).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[10px]">
                {indicators.filter((i) => i.enabled).length}
              </span>
            )}
          </button>

          {/* Indicator Dropdown Menu */}
          {showIndicatorMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl overflow-hidden">
              <div className="p-2 border-b border-[#2d2d44]">
                <span className="text-xs font-semibold text-gray-400 uppercase">Overlays</span>
              </div>
              {indicators
                .filter((i) => i.type === 'overlay')
                .map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-[#252542] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: indicator.color }}
                      />
                      {indicator.name}
                    </div>
                    {indicator.enabled && (
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}

              <div className="p-2 border-t border-b border-[#2d2d44]">
                <span className="text-xs font-semibold text-gray-400 uppercase">Oscillators</span>
              </div>
              {indicators
                .filter((i) => i.type === 'panel')
                .map((indicator) => (
                  <button
                    key={indicator.id}
                    onClick={() => toggleIndicator(indicator.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-300 hover:bg-[#252542] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: indicator.color }}
                      />
                      {indicator.name}
                    </div>
                    {indicator.enabled && (
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Close indicator menu when clicking outside */}
      {showIndicatorMenu && (
        <div className="fixed inset-0 z-[5]" onClick={() => setShowIndicatorMenu(false)} />
      )}

      {/* Main Chart Container */}
      <div
        ref={chartContainerRef}
        className="w-full"
        style={{ flex: hasRSI || hasMACD ? '1 1 60%' : '1 1 100%', minHeight: 0 }}
      />

      {/* RSI Panel */}
      {hasRSI && (
        <div className="border-t border-[#2d2d44] relative">
          <div className="absolute top-1 left-2 z-10 text-xs text-gray-500">RSI (14)</div>
          <div ref={rsiContainerRef} className="w-full h-[100px]" />
        </div>
      )}

      {/* MACD Panel */}
      {hasMACD && (
        <div className="border-t border-[#2d2d44] relative">
          <div className="absolute top-1 left-2 z-10 text-xs text-gray-500">MACD (12, 26, 9)</div>
          <div ref={macdContainerRef} className="w-full h-[100px]" />
        </div>
      )}

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
