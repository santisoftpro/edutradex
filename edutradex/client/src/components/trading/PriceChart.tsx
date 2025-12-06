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
  AreaSeries,
  BarSeries,
  MouseEventParams,
} from 'lightweight-charts';
import { ChevronDown, BarChart3, X, Check, TrendingUp, Minus, GitBranch, Trash2, CandlestickChart, LineChart, AreaChart, BarChart, Undo2, PenTool } from 'lucide-react';
import { PriceTick, api, OHLCBar } from '@/lib/api';
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
  volume?: number;
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

interface OHLCInfo {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  changePercent: number;
}

type ChartType = 'candlestick' | 'line' | 'area' | 'bars' | 'heikin-ashi';

interface ChartTypeOption {
  id: ChartType;
  name: string;
}

type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci';

interface DrawnLine {
  id: string;
  type: 'trendline' | 'horizontal' | 'fibonacci';
  points: { time: Time; value: number }[];
}

// Chart type icons rendered dynamically to avoid hydration mismatch
const getChartTypeIcon = (id: ChartType) => {
  switch (id) {
    case 'candlestick':
      return <CandlestickChart className="w-4 h-4" />;
    case 'line':
      return <LineChart className="w-4 h-4" />;
    case 'area':
      return <AreaChart className="w-4 h-4" />;
    case 'bars':
      return <BarChart className="w-4 h-4" />;
    case 'heikin-ashi':
      return <CandlestickChart className="w-4 h-4" />;
    default:
      return <CandlestickChart className="w-4 h-4" />;
  }
};

const CHART_TYPES: ChartTypeOption[] = [
  { id: 'candlestick', name: 'Candlestick' },
  { id: 'line', name: 'Line' },
  { id: 'area', name: 'Area' },
  { id: 'bars', name: 'OHLC Bars' },
  { id: 'heikin-ashi', name: 'Heikin Ashi' },
];

// Grouped timeframes for better organization
const TIMEFRAME_GROUPS = {
  seconds: [
    { label: '5s', seconds: 5 },
    { label: '10s', seconds: 10 },
    { label: '30s', seconds: 30 },
  ],
  minutes: [
    { label: '1m', seconds: 60 },
    { label: '2m', seconds: 120 },
    { label: '3m', seconds: 180 },
    { label: '5m', seconds: 300 },
    { label: '10m', seconds: 600 },
    { label: '15m', seconds: 900 },
    { label: '30m', seconds: 1800 },
  ],
  hours: [
    { label: '1h', seconds: 3600 },
    { label: '2h', seconds: 7200 },
    { label: '4h', seconds: 14400 },
    { label: '6h', seconds: 21600 },
    { label: '8h', seconds: 28800 },
    { label: '12h', seconds: 43200 },
  ],
  days: [
    { label: '1D', seconds: 86400 },
  ],
};

const TIMEFRAMES: TimeframeOption[] = [
  ...TIMEFRAME_GROUPS.seconds,
  ...TIMEFRAME_GROUPS.minutes,
  ...TIMEFRAME_GROUPS.hours,
  ...TIMEFRAME_GROUPS.days,
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

function formatVolume(volume: number): string {
  if (volume >= 1000000000) return (volume / 1000000000).toFixed(2) + 'B';
  if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
  if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
  return volume.toFixed(2);
}

function convertToHeikinAshi(candles: CandleData[]): CandleData[] {
  if (candles.length === 0) return [];

  const result: CandleData[] = [];

  for (let i = 0; i < candles.length; i++) {
    const current = candles[i];
    const prev = i > 0 ? result[i - 1] : null;

    const haClose = (current.open + current.high + current.low + current.close) / 4;
    const haOpen = prev ? (prev.open + prev.close) / 2 : (current.open + current.close) / 2;
    const haHigh = Math.max(current.high, haOpen, haClose);
    const haLow = Math.min(current.low, haOpen, haClose);

    result.push({
      time: current.time,
      open: Number(haOpen.toFixed(6)),
      high: Number(haHigh.toFixed(6)),
      low: Number(haLow.toFixed(6)),
      close: Number(haClose.toFixed(6)),
      volume: current.volume,
    });
  }

  return result;
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

  // New features state
  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [ohlcInfo, setOhlcInfo] = useState<OHLCInfo | null>(null);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none');
  const [drawnLines, setDrawnLines] = useState<DrawnLine[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDrawingMenu, setShowDrawingMenu] = useState(false);
  const drawingPointsRef = useRef<{ time: Time; value: number }[]>([]);

  // Volume series ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mainSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volumeDataRef = useRef<{ time: Time; value: number; color: string }[]>([]);

  // Drawing tools refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const drawnSeriesRef = useRef<Map<string, ISeriesApi<any>[]>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const horizontalLinesRef = useRef<Map<string, { priceLine: any; price: number }>>(new Map());
  const drawingStartRef = useRef<{ time: Time; value: number } | null>(null);

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

    // Add volume histogram series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });

    // Configure volume price scale (at bottom, smaller)
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderVisible: false,
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    mainSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;

    // Crosshair move handler for OHLC info
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.time || !param.seriesData) {
        setOhlcInfo(null);
        return;
      }

      const candleData = param.seriesData.get(candlestickSeries);
      if (candleData && 'open' in candleData) {
        const data = candleData as { open: number; high: number; low: number; close: number };
        const change = data.close - data.open;
        const changePercent = (change / data.open) * 100;

        setOhlcInfo({
          time: new Date((param.time as number) * 1000).toLocaleString(),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          change,
          changePercent,
        });
      }
    });

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
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
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

  // Toggle volume visibility
  useEffect(() => {
    if (!volumeSeriesRef.current || !chartRef.current) return;

    if (showVolume) {
      chartRef.current.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.85, bottom: 0 },
      });
      if (volumeDataRef.current.length > 0) {
        volumeSeriesRef.current.setData(volumeDataRef.current);
      }
    } else {
      volumeSeriesRef.current.setData([]);
    }
  }, [showVolume]);

  // Handle chart type changes - recreate main series
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;

    // Remove old main series if exists
    if (mainSeriesRef.current) {
      try {
        chart.removeSeries(mainSeriesRef.current);
      } catch (e) {
        // Series might already be removed
      }
      mainSeriesRef.current = null;
      candlestickSeriesRef.current = null;
    }

    // Create new series based on chart type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newSeries: ISeriesApi<any>;

    try {
      switch (chartType) {
        case 'line':
          newSeries = chart.addSeries(LineSeries, {
            color: '#22c55e',
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
          });
          break;

        case 'area':
          newSeries = chart.addSeries(AreaSeries, {
            topColor: 'rgba(34, 197, 94, 0.4)',
            bottomColor: 'rgba(34, 197, 94, 0.0)',
            lineColor: '#22c55e',
            lineWidth: 2,
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
          });
          break;

        case 'bars':
          newSeries = chart.addSeries(BarSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
          });
          break;

        case 'candlestick':
        case 'heikin-ashi':
        default:
          newSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
          });
          break;
      }

      mainSeriesRef.current = newSeries;
      candlestickSeriesRef.current = newSeries;

      // Re-apply data if we have it
      if (candlesRef.current.length > 0) {
        let dataToSet = [...candlesRef.current];

        // Convert to Heikin Ashi if needed
        if (chartType === 'heikin-ashi') {
          dataToSet = convertToHeikinAshi(dataToSet);
        }

        // For line/area charts, only use close price
        if (chartType === 'line' || chartType === 'area') {
          const lineData = dataToSet.map(c => ({ time: c.time, value: c.close }));
          newSeries.setData(lineData);
        } else {
          newSeries.setData(dataToSet);
        }
      }
    } catch (e) {
      console.error('Error creating chart series:', e);
    }

  }, [chartType]);

  // Recreate horizontal lines on the new series after chart type changes
  useEffect(() => {
    if (!mainSeriesRef.current || horizontalLinesRef.current.size === 0) return;

    // Small delay to ensure series is ready
    const timer = setTimeout(() => {
      const linesToRecreate = Array.from(horizontalLinesRef.current.entries());

      // Clear old refs (price lines were on old series)
      horizontalLinesRef.current.clear();

      // Recreate each horizontal line on new series
      linesToRecreate.forEach(([lineId, { price }]) => {
        if (mainSeriesRef.current) {
          try {
            const newPriceLine = mainSeriesRef.current.createPriceLine({
              price: price,
              color: '#f59e0b',
              lineWidth: 2,
              lineStyle: 2,
              axisLabelVisible: true,
              title: `${formatPrice(price)}`,
            });
            horizontalLinesRef.current.set(lineId, { priceLine: newPriceLine, price });
          } catch (e) {
            console.error('Failed to recreate price line:', e);
          }
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [chartType]);

  // Handle drawing tools - click on chart to draw
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;

    const chart = chartRef.current;

    const handleClick = (param: MouseEventParams) => {
      if (drawingTool === 'none' || !param.time || !param.point) return;

      const price = mainSeriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      const clickPoint = { time: param.time as Time, value: price };

      if (drawingTool === 'horizontal') {
        // Horizontal line using createPriceLine - persists across timeframe changes
        const lineId = `horizontal-${Date.now()}`;

        if (mainSeriesRef.current) {
          const priceLine = mainSeriesRef.current.createPriceLine({
            price: price,
            color: '#f59e0b',
            lineWidth: 2,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${formatPrice(price)}`,
          });

          horizontalLinesRef.current.set(lineId, { priceLine, price });
          setDrawnLines(prev => [...prev, { id: lineId, type: 'horizontal', points: [clickPoint] }]);
        }
        setDrawingTool('none');

      } else if (drawingTool === 'trendline') {
        // Trend line - needs two clicks
        if (!drawingStartRef.current) {
          drawingStartRef.current = clickPoint;
          setIsDrawing(true);
        } else {
          const lineId = `trendline-${Date.now()}`;
          const lineSeries = chart.addSeries(LineSeries, {
            color: '#8b5cf6',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          lineSeries.setData([
            { time: drawingStartRef.current.time, value: drawingStartRef.current.value },
            { time: clickPoint.time, value: clickPoint.value },
          ]);

          drawnSeriesRef.current.set(lineId, [lineSeries]);
          setDrawnLines(prev => [...prev, { id: lineId, type: 'trendline', points: [drawingStartRef.current!, clickPoint] }]);
          drawingStartRef.current = null;
          setIsDrawing(false);
          setDrawingTool('none');
        }

      } else if (drawingTool === 'fibonacci') {
        // Fibonacci - needs two clicks for high/low
        if (!drawingStartRef.current) {
          drawingStartRef.current = clickPoint;
          setIsDrawing(true);
        } else {
          const lineId = `fibonacci-${Date.now()}`;
          const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const fibColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ef4444'];
          const fibSeries: ISeriesApi<any>[] = [];

          const highValue = Math.max(drawingStartRef.current.value, clickPoint.value);
          const lowValue = Math.min(drawingStartRef.current.value, clickPoint.value);
          const range = highValue - lowValue;

          const timeScale = chart.timeScale();
          const visibleRange = timeScale.getVisibleLogicalRange();
          if (visibleRange && candlesRef.current.length > 0) {
            const startIdx = Math.max(0, Math.floor(visibleRange.from));
            const endIdx = Math.min(candlesRef.current.length - 1, Math.ceil(visibleRange.to));
            const startTime = candlesRef.current[startIdx]?.time;
            const endTime = candlesRef.current[endIdx]?.time;

            fibLevels.forEach((level, idx) => {
              const levelValue = highValue - (range * level);
              const series = chart.addSeries(LineSeries, {
                color: fibColors[idx],
                lineWidth: 1,
                lineStyle: 2,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
              });

              if (startTime && endTime) {
                series.setData([
                  { time: startTime, value: levelValue },
                  { time: endTime, value: levelValue },
                ]);
              }
              fibSeries.push(series);
            });
          }

          drawnSeriesRef.current.set(lineId, fibSeries);
          setDrawnLines(prev => [...prev, { id: lineId, type: 'fibonacci', points: [drawingStartRef.current!, clickPoint] }]);
          drawingStartRef.current = null;
          setIsDrawing(false);
          setDrawingTool('none');
        }
      }
    };

    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [drawingTool]);

  // Clear all drawings
  useEffect(() => {
    if (drawnLines.length === 0 && (drawnSeriesRef.current.size > 0 || horizontalLinesRef.current.size > 0)) {
      // User clicked clear - remove all series (trend lines, fibonacci)
      drawnSeriesRef.current.forEach((seriesList) => {
        seriesList.forEach((series) => {
          try {
            chartRef.current?.removeSeries(series);
          } catch (e) {
            // Series might already be removed
          }
        });
      });
      drawnSeriesRef.current.clear();

      // Remove all horizontal price lines
      horizontalLinesRef.current.forEach(({ priceLine }) => {
        try {
          mainSeriesRef.current?.removePriceLine(priceLine);
        } catch (e) {
          // Price line might already be removed
        }
      });
      horizontalLinesRef.current.clear();

      drawingStartRef.current = null;
      setIsDrawing(false);
    }
  }, [drawnLines]);

  // Reset when symbol or timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;

    candlestickSeriesRef.current.setData([]);
    currentCandleRef.current = null;
    candlesRef.current = [];
    lastCandleTimeRef.current = 0;
    initializedKeyRef.current = null;
    lastPriceRef.current = 0;

    // Clear volume data
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData([]);
    }
    volumeDataRef.current = [];

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

    // Clear only time-dependent drawings (trend lines, fibonacci) when timeframe changes
    // Horizontal lines will be recreated on the new series
    drawnSeriesRef.current.forEach((seriesList) => {
      seriesList.forEach((series) => {
        try {
          chartRef.current?.removeSeries(series);
        } catch (e) {
          // Series might already be removed
        }
      });
    });
    drawnSeriesRef.current.clear();

    // Remove horizontal lines from old series (they'll be recreated)
    horizontalLinesRef.current.forEach(({ priceLine }) => {
      try {
        // Try to remove from any series - might fail if series was already removed
        mainSeriesRef.current?.removePriceLine(priceLine);
      } catch (e) {
        // Ignore - old series might be gone
      }
    });

    // Filter drawnLines to only keep horizontal lines (they persist)
    setDrawnLines(prev => prev.filter(line => line.type === 'horizontal'));
    setDrawingTool('none');
    drawingStartRef.current = null;
    setIsDrawing(false);
  }, [symbol, candleInterval, chartType]);

  // Fetch real historical data when symbol or timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !chartRef.current) return;

    const initKey = `${symbol}-${candleInterval}-${chartType}`;
    if (initializedKeyRef.current === initKey) return;

    let cancelled = false;

    async function fetchHistoricalData() {
      try {
        // Fetch real historical bars from API (uses Binance for crypto)
        const bars = await api.getHistoricalBars(symbol, candleInterval, 500);

        if (cancelled || !candlestickSeriesRef.current) return;

        if (bars.length > 0) {
          // Convert API bars to chart format - filter out invalid data
          let chartCandles: CandleData[] = bars
            .filter((bar: OHLCBar) => bar.open != null && bar.high != null && bar.low != null && bar.close != null)
            .map((bar: OHLCBar) => ({
              time: bar.time as Time,
              open: Number(bar.open) || 0,
              high: Number(bar.high) || 0,
              low: Number(bar.low) || 0,
              close: Number(bar.close) || 0,
              volume: Number(bar.volume) || 0,
            }));

          if (chartCandles.length === 0) return;

          // Store original candles for indicators (always OHLC format)
          candlesRef.current = chartCandles;

          // Convert to Heikin Ashi if needed
          if (chartType === 'heikin-ashi') {
            chartCandles = convertToHeikinAshi(chartCandles);
          }

          // Set data in the correct format for the series type
          if (chartType === 'line' || chartType === 'area') {
            const lineData = chartCandles.map(c => ({ time: c.time, value: c.close }));
            candlestickSeriesRef.current.setData(lineData);
          } else {
            candlestickSeriesRef.current.setData(chartCandles);
          }

          // Set volume data (use original candles, not HA converted)
          if (volumeSeriesRef.current && showVolume) {
            const volumeData = candlesRef.current.map((c) => ({
              time: c.time,
              value: c.volume || 0,
              color: c.close >= c.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            }));
            volumeSeriesRef.current.setData(volumeData);
            volumeDataRef.current = volumeData;
          }

          // Use original candles for tracking current candle state
          const lastCandle = candlesRef.current[candlesRef.current.length - 1];
          currentCandleRef.current = { ...lastCandle };
          lastCandleTimeRef.current = lastCandle.time as number;
          lastPriceRef.current = lastCandle.close;
          initializedKeyRef.current = initKey;

          chartRef.current?.timeScale().scrollToRealTime();
          // Use original candles for indicators (not HA converted)
          updateIndicators(candlesRef.current);
        }
      } catch (error) {
        console.error('Failed to fetch historical bars:', error);
        // Fallback to synthetic data if API fails
        if (!cancelled && currentPrice) {
          const initialCandles = generateInitialHistory(currentPrice.price, candleInterval, 100);
          candlestickSeriesRef.current?.setData(initialCandles);
          candlesRef.current = initialCandles;
          const lastCandle = initialCandles[initialCandles.length - 1];
          currentCandleRef.current = { ...lastCandle };
          lastCandleTimeRef.current = lastCandle.time as number;
          initializedKeyRef.current = initKey;
          lastPriceRef.current = currentPrice.price;
          chartRef.current?.timeScale().scrollToRealTime();
          updateIndicators(initialCandles);
        }
      }
    }

    fetchHistoricalData();

    return () => {
      cancelled = true;
    };
  }, [symbol, candleInterval, chartType, showVolume, updateIndicators, currentPrice]);

  // Handle real-time price updates
  useEffect(() => {
    if (!candlestickSeriesRef.current || !currentPrice || !chartRef.current || !mainSeriesRef.current) return;

    const price = currentPrice.price;
    const candleTime = getCandleTime(currentPrice.timestamp);
    const initKey = `${symbol}-${candleInterval}-${chartType}`;

    // Wait for historical data to be loaded first
    if (initializedKeyRef.current !== initKey) return;

    // Skip if price hasn't changed
    if (price === lastPriceRef.current) return;

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

      // Update series based on chart type
      if (chartType === 'line' || chartType === 'area') {
        candlestickSeriesRef.current.update({ time: candleTime as Time, value: price });
      } else if (chartType === 'heikin-ashi') {
        // For Heikin Ashi, calculate the HA values
        const prevHA = candlesRef.current.length > 0 ? candlesRef.current[candlesRef.current.length - 1] : newCandle;
        const haClose = (newCandle.open + newCandle.high + newCandle.low + newCandle.close) / 4;
        const haOpen = (prevHA.open + prevHA.close) / 2;
        const haHigh = Math.max(newCandle.high, haOpen, haClose);
        const haLow = Math.min(newCandle.low, haOpen, haClose);
        candlestickSeriesRef.current.update({
          time: candleTime as Time,
          open: haOpen,
          high: haHigh,
          low: haLow,
          close: haClose,
        });
      } else {
        candlestickSeriesRef.current.update(newCandle);
      }

      // Add to candles array and update indicators (keep more candles for better indicators)
      candlesRef.current = [...candlesRef.current.slice(-499), newCandle];
      updateIndicators(candlesRef.current);
    } else if (currentCandleRef.current) {
      currentCandleRef.current.high = Math.max(currentCandleRef.current.high, price);
      currentCandleRef.current.low = Math.min(currentCandleRef.current.low, price);
      currentCandleRef.current.close = price;

      // Update series based on chart type
      if (chartType === 'line' || chartType === 'area') {
        candlestickSeriesRef.current.update({ time: currentCandleRef.current.time, value: price });
      } else if (chartType === 'heikin-ashi') {
        const prevHA = candlesRef.current.length > 1 ? candlesRef.current[candlesRef.current.length - 2] : currentCandleRef.current;
        const c = currentCandleRef.current;
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen = (prevHA.open + prevHA.close) / 2;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        candlestickSeriesRef.current.update({
          time: c.time,
          open: haOpen,
          high: haHigh,
          low: haLow,
          close: haClose,
        });
      } else {
        candlestickSeriesRef.current.update(currentCandleRef.current);
      }

      // Update last candle in array
      if (candlesRef.current.length > 0) {
        candlesRef.current[candlesRef.current.length - 1] = { ...currentCandleRef.current };
      }
    }

    lastPriceRef.current = price;
  }, [currentPrice, getCandleTime, symbol, candleInterval, chartType, updateIndicators]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f1a] relative">
      {/* OHLC Info Panel - Top Right */}
      {ohlcInfo && (
        <div className="absolute top-2 right-2 z-20 bg-gradient-to-b from-[#1e1e38]/95 to-[#1a1a2e]/95 border border-[#3d3d5c] rounded-xl px-3 py-2 backdrop-blur-sm shadow-xl">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px]">O</span>
              <span className="text-white font-mono">{formatPrice(ohlcInfo.open)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px]">H</span>
              <span className="text-emerald-400 font-mono">{formatPrice(ohlcInfo.high)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px]">L</span>
              <span className="text-red-400 font-mono">{formatPrice(ohlcInfo.low)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px]">C</span>
              <span className="text-white font-mono">{formatPrice(ohlcInfo.close)}</span>
            </div>
            <div className="flex flex-col border-l border-[#3d3d5c] pl-3">
              <span className="text-gray-500 text-[10px]">Change</span>
              <span className={`font-mono font-semibold ${ohlcInfo.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {ohlcInfo.change >= 0 ? '+' : ''}{ohlcInfo.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Controls - Top Left */}
      <div className="md:hidden absolute top-2 left-2 z-10 flex items-center gap-2">
        {/* Timeframe Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-white text-sm font-semibold shadow-lg hover:border-emerald-500/50 transition-all"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {selectedTimeframe.label}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showTimeframeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showTimeframeMenu && (
            <>
              <div className="fixed inset-0 z-[15]" onClick={() => setShowTimeframeMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-64 bg-gradient-to-b from-[#1e1e38] to-[#151528] border border-[#3d3d5c] rounded-xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl">
                {/* Seconds */}
                <div className="p-2 border-b border-[#2d2d44]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">Seconds</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.seconds.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Minutes */}
                <div className="p-2 border-b border-[#2d2d44]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">Minutes</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.minutes.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Hours */}
                <div className="p-2 border-b border-[#2d2d44]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">Hours</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.hours.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Days */}
                <div className="p-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2">Days</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.days.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Indicator Button */}
        <button
          onClick={() => setShowMobileIndicatorSheet(true)}
          className="relative flex items-center justify-center w-10 h-10 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl shadow-lg hover:border-blue-500/50 transition-all"
        >
          <BarChart3 className="h-5 w-5 text-gray-400" />
          {activeIndicatorCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg shadow-emerald-500/40">
              {activeIndicatorCount}
            </span>
          )}
        </button>

        {/* Chart Type Button (Mobile) */}
        <button
          onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
          className="flex items-center justify-center w-10 h-10 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl shadow-lg hover:border-purple-500/50 transition-all"
        >
          {getChartTypeIcon(chartType)}
        </button>

        {/* Volume Toggle (Mobile) */}
        <button
          onClick={() => setShowVolume(!showVolume)}
          className={`flex items-center justify-center w-10 h-10 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border rounded-xl shadow-lg transition-all ${
            showVolume ? 'border-cyan-500/50 text-cyan-400' : 'border-[#3d3d5c] text-gray-400'
          }`}
        >
          <BarChart className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile Drawing Tools - Bottom */}
      <div className="md:hidden absolute bottom-10 left-2 z-10">
        <div className="relative">
          <button
            onClick={() => setShowDrawingMenu(!showDrawingMenu)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-sm font-medium shadow-lg ${
              drawingTool !== 'none'
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                : 'bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] text-gray-400'
            }`}
          >
            <PenTool className="w-5 h-5" />
            {drawnLines.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500/30 text-orange-400 rounded text-xs font-bold">
                {drawnLines.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDrawingMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Mobile Dropdown Menu */}
          {showDrawingMenu && (
            <>
              <div className="fixed inset-0 z-[15]" onClick={() => setShowDrawingMenu(false)} />
              <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#1a1a2e] border border-[#3d3d5c] rounded-xl shadow-2xl z-[20] overflow-hidden">
                {/* Drawing Tools Section */}
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider">Drawing Tools</p>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'trendline' ? 'none' : 'trendline');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      drawingTool === 'trendline'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-300 active:bg-[#252542]'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Trend Line</div>
                      <div className="text-[10px] text-gray-500">Click 2 points</div>
                    </div>
                    {drawingTool === 'trendline' && <Check className="w-5 h-5 text-orange-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'horizontal' ? 'none' : 'horizontal');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      drawingTool === 'horizontal'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-300 active:bg-[#252542]'
                    }`}
                  >
                    <Minus className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Horizontal Line</div>
                      <div className="text-[10px] text-gray-500">Click to place</div>
                    </div>
                    {drawingTool === 'horizontal' && <Check className="w-5 h-5 text-orange-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'fibonacci' ? 'none' : 'fibonacci');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                      drawingTool === 'fibonacci'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-300 active:bg-[#252542]'
                    }`}
                  >
                    <GitBranch className="w-5 h-5" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Fibonacci</div>
                      <div className="text-[10px] text-gray-500">Click high & low</div>
                    </div>
                    {drawingTool === 'fibonacci' && <Check className="w-5 h-5 text-orange-400" />}
                  </button>
                </div>

                {/* Actions Section */}
                {drawnLines.length > 0 && (
                  <>
                    <div className="border-t border-[#3d3d5c]" />
                    <div className="p-2">
                      <p className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {drawnLines.length} Drawing{drawnLines.length > 1 ? 's' : ''}
                      </p>

                      <button
                        onClick={() => {
                          const lastLine = drawnLines[drawnLines.length - 1];
                          if (lastLine) {
                            if (lastLine.type === 'horizontal') {
                              const lineData = horizontalLinesRef.current.get(lastLine.id);
                              if (lineData) {
                                try { mainSeriesRef.current?.removePriceLine(lineData.priceLine); } catch (e) { /* ignore */ }
                                horizontalLinesRef.current.delete(lastLine.id);
                              }
                            } else {
                              const series = drawnSeriesRef.current.get(lastLine.id);
                              if (series) {
                                series.forEach(s => {
                                  try { chartRef.current?.removeSeries(s); } catch (e) { /* ignore */ }
                                });
                                drawnSeriesRef.current.delete(lastLine.id);
                              }
                            }
                            setDrawnLines(prev => prev.slice(0, -1));
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-yellow-400 active:bg-yellow-500/10"
                      >
                        <Undo2 className="w-5 h-5" />
                        <span className="text-sm font-medium">Undo Last</span>
                      </button>

                      {drawnLines.length > 1 && (
                        <button
                          onClick={() => {
                            setDrawnLines([]);
                            setShowDrawingMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 active:bg-red-500/10"
                        >
                          <Trash2 className="w-5 h-5" />
                          <span className="text-sm font-medium">Clear All</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Chart Type Menu */}
      {showChartTypeMenu && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/60 z-[55]" onClick={() => setShowChartTypeMenu(false)} />
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a2e] rounded-t-2xl z-[60] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#2d2d44]">
              <h3 className="text-white font-semibold text-lg">Chart Type</h3>
              <button onClick={() => setShowChartTypeMenu(false)} className="p-2 -mr-2 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  onClick={() => { setChartType(ct.id); setShowChartTypeMenu(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1 transition-all ${
                    chartType === ct.id ? 'bg-purple-500/20 text-purple-400' : 'text-gray-300 active:bg-[#252542]'
                  }`}
                >
                  {getChartTypeIcon(ct.id)}
                  <span className="text-base">{ct.name}</span>
                  {chartType === ct.id && <Check className="w-5 h-5 ml-auto" />}
                </button>
              ))}
            </div>
            <div className="h-6" />
          </div>
        </>
      )}

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
        {/* Timeframe Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTimeframeMenu(!showTimeframeMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-white text-sm font-semibold shadow-lg hover:border-emerald-500/50 transition-all backdrop-blur-sm"
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="min-w-[28px]">{selectedTimeframe.label}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showTimeframeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showTimeframeMenu && (
            <>
              <div className="fixed inset-0 z-[5]" onClick={() => setShowTimeframeMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-72 bg-gradient-to-b from-[#1e1e38] to-[#151528] border border-[#3d3d5c] rounded-xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl">
                {/* Header */}
                <div className="px-3 py-2 border-b border-[#2d2d44] bg-[#1a1a2e]/50">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Select Timeframe</span>
                </div>
                {/* Seconds */}
                <div className="p-2.5 border-b border-[#2d2d44]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Seconds</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.seconds.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Minutes */}
                <div className="p-2.5 border-b border-[#2d2d44]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Minutes</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.minutes.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Hours */}
                <div className="p-2.5 border-b border-[#2d2d44]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Hours</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.hours.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Days */}
                <div className="p-2.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1">Days</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TIMEFRAME_GROUPS.days.map((tf) => (
                      <button
                        key={tf.label}
                        onClick={() => { setSelectedTimeframe(tf); setShowTimeframeMenu(false); }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedTimeframe.label === tf.label
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                            : 'bg-[#252542] text-gray-400 hover:bg-[#2d2d52] hover:text-white'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Indicator Button */}
        <div className="relative">
          <button
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:border-blue-500/50 transition-all shadow-lg backdrop-blur-sm"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Indicators
            {indicators.filter((i) => i.enabled).length > 0 && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white rounded-md text-[10px] font-bold shadow-lg shadow-emerald-500/30">
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

        {/* Chart Type Selector */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:border-purple-500/50 transition-all shadow-lg backdrop-blur-sm"
          >
            {getChartTypeIcon(chartType)}
            <span className="hidden lg:inline">{CHART_TYPES.find(ct => ct.id === chartType)?.name}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showChartTypeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showChartTypeMenu && (
            <>
              <div className="fixed inset-0 z-[5]" onClick={() => setShowChartTypeMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-44 bg-gradient-to-b from-[#1e1e38] to-[#151528] border border-[#3d3d5c] rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2d2d44] bg-[#1a1a2e]/50">
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Chart Type</span>
                </div>
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => { setChartType(ct.id); setShowChartTypeMenu(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${
                      chartType === ct.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-gray-400 hover:bg-[#252542] hover:text-white'
                    }`}
                  >
                    {getChartTypeIcon(ct.id)}
                    <span>{ct.name}</span>
                    {chartType === ct.id && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Volume Toggle */}
        <button
          onClick={() => setShowVolume(!showVolume)}
          className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border rounded-xl text-sm font-semibold transition-all shadow-lg backdrop-blur-sm ${
            showVolume
              ? 'border-cyan-500/50 text-cyan-400'
              : 'border-[#3d3d5c] text-gray-400 hover:text-white hover:border-cyan-500/30'
          }`}
          title="Toggle Volume"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden lg:inline">Vol</span>
        </button>

        {/* Drawing Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDrawingMenu(!showDrawingMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm font-medium shadow-lg ${
              drawingTool !== 'none'
                ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                : 'bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] text-gray-400 hover:text-white'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span className="hidden sm:inline">
              {drawingTool === 'none' ? 'Draw' :
               drawingTool === 'trendline' ? 'Trend Line' :
               drawingTool === 'horizontal' ? 'H-Line' : 'Fibonacci'}
            </span>
            {drawnLines.length > 0 && (
              <span className="px-1.5 py-0.5 bg-orange-500/30 text-orange-400 rounded text-xs font-bold">
                {drawnLines.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDrawingMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDrawingMenu && (
            <>
              <div className="fixed inset-0 z-[15]" onClick={() => setShowDrawingMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e] border border-[#3d3d5c] rounded-xl shadow-2xl z-[20] overflow-hidden">
                {/* Drawing Tools Section */}
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider">Drawing Tools</p>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'trendline' ? 'none' : 'trendline');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'trendline'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Trend Line</div>
                      <div className="text-[10px] text-gray-500">Click 2 points</div>
                    </div>
                    {drawingTool === 'trendline' && <Check className="w-4 h-4 text-orange-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'horizontal' ? 'none' : 'horizontal');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'horizontal'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Horizontal Line</div>
                      <div className="text-[10px] text-gray-500">Click to place</div>
                    </div>
                    {drawingTool === 'horizontal' && <Check className="w-4 h-4 text-orange-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'fibonacci' ? 'none' : 'fibonacci');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'fibonacci'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                  >
                    <GitBranch className="w-4 h-4" />
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">Fibonacci</div>
                      <div className="text-[10px] text-gray-500">Click high & low</div>
                    </div>
                    {drawingTool === 'fibonacci' && <Check className="w-4 h-4 text-orange-400" />}
                  </button>
                </div>

                {/* Actions Section */}
                {drawnLines.length > 0 && (
                  <>
                    <div className="border-t border-[#3d3d5c]" />
                    <div className="p-2">
                      <p className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {drawnLines.length} Drawing{drawnLines.length > 1 ? 's' : ''}
                      </p>

                      <button
                        onClick={() => {
                          const lastLine = drawnLines[drawnLines.length - 1];
                          if (lastLine) {
                            if (lastLine.type === 'horizontal') {
                              const lineData = horizontalLinesRef.current.get(lastLine.id);
                              if (lineData) {
                                try { mainSeriesRef.current?.removePriceLine(lineData.priceLine); } catch (e) { /* ignore */ }
                                horizontalLinesRef.current.delete(lastLine.id);
                              }
                            } else {
                              const series = drawnSeriesRef.current.get(lastLine.id);
                              if (series) {
                                series.forEach(s => {
                                  try { chartRef.current?.removeSeries(s); } catch (e) { /* ignore */ }
                                });
                                drawnSeriesRef.current.delete(lastLine.id);
                              }
                            }
                            setDrawnLines(prev => prev.slice(0, -1));
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-all"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Undo Last</span>
                      </button>

                      {drawnLines.length > 1 && (
                        <button
                          onClick={() => {
                            setDrawnLines([]);
                            setShowDrawingMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Clear All</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Close menus when clicking outside */}
      {(showIndicatorMenu || showChartTypeMenu || showDrawingMenu) && (
        <div className="fixed inset-0 z-[5]" onClick={() => { setShowIndicatorMenu(false); setShowChartTypeMenu(false); setShowDrawingMenu(false); }} />
      )}

      {/* Drawing Mode Indicator */}
      {drawingTool !== 'none' && (
        <div className="absolute top-14 left-2 z-10 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 text-xs font-semibold flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          {drawingTool === 'horizontal' && 'Click chart to place horizontal line'}
          {drawingTool === 'trendline' && (isDrawing ? 'Click second point for trend line' : 'Click first point for trend line')}
          {drawingTool === 'fibonacci' && (isDrawing ? 'Click second point (low/high)' : 'Click first point (high/low)')}
          <button
            onClick={() => { setDrawingTool('none'); drawingStartRef.current = null; setIsDrawing(false); }}
            className="ml-1 text-orange-300 hover:text-white bg-orange-500/30 rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
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
