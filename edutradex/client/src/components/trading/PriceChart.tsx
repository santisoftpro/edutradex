'use client';

import { useEffect, useRef, memo, useCallback, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  Time,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  AreaSeries,
  BarSeries,
  MouseEventParams,
  SeriesType,
} from 'lightweight-charts';
import { ChevronDown, BarChart3, X, Check, TrendingUp, Minus, GitBranch, Trash2, CandlestickChart, LineChart, AreaChart, BarChart, Undo2, PenTool, Camera, Magnet, Settings, Layout } from 'lucide-react';
import { PriceTick, api, OHLCBar } from '@/lib/api';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateATR,
  calculateVWAP,
  getIchimokuCloudData,
  CandleData as IndicatorCandleData,
  CandleDataWithVolume,
} from '@/lib/indicators';
import { useChartStore, IndicatorConfig, DrawingTool, DrawnLine, CHART_TEMPLATES, PriceAlert } from '@/store/chart.store';
import { useTradeStore, useFilteredActiveTrades, Trade } from '@/store/trade.store';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface PriceChartProps {
  symbol: string;
  currentPrice: PriceTick | null;
  onDrawingsChange?: (count: number) => void;
}

export interface PriceChartHandle {
  undoDrawing: () => void;
  clearDrawings: () => void;
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

// IndicatorConfig is imported from chart.store.ts

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

// DrawingTool and DrawnLine types imported from chart.store.ts

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

// DEFAULT_INDICATORS is now defined in chart.store.ts

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

/**
 * Trade Marker Pill - Pocket Option Style
 * Displays at entry price level with direction arrow, amount, and countdown
 * Color changes based on real-time profit/loss status
 */
function TradeMarkerPill({ trade, currentPrice }: { trade: Trade; currentPrice?: number }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const expiresAt = new Date(trade.expiresAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      const seconds = Math.ceil(remaining / 1000);

      if (seconds < 60) {
        setTimeLeft(`${seconds.toString().padStart(2, '0')}s`);
      } else {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [trade.expiresAt]);

  const isUp = trade.direction === 'UP';

  // Calculate if trade is currently winning based on price movement
  const isWinning = currentPrice
    ? isUp
      ? currentPrice > trade.entryPrice  // UP wins if price went up
      : currentPrice < trade.entryPrice  // DOWN wins if price went down
    : isUp; // Fallback to direction color if no current price

  return (
    <div
      className={`
        flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded
        text-white text-[11px] font-medium shadow-lg backdrop-blur-sm
        transition-colors duration-300
        ${isWinning ? 'bg-emerald-500/90' : 'bg-red-500/90'}
      `}
    >
      {isUp ? (
        <ArrowUp className="w-3 h-3" strokeWidth={3} />
      ) : (
        <ArrowDown className="w-3 h-3" strokeWidth={3} />
      )}
      <span className="font-semibold">${trade.amount}</span>
      <span className="font-mono text-[10px] opacity-90">{timeLeft}</span>
    </div>
  );
}

const PriceChartComponent = forwardRef<PriceChartHandle, PriceChartProps>(
  function PriceChartComponent({ symbol, currentPrice, onDrawingsChange }, ref) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const stochasticContainerRef = useRef<HTMLDivElement>(null);
  const atrContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const stochasticChartRef = useRef<IChartApi | null>(null);
  const atrChartRef = useRef<IChartApi | null>(null);

  const candlestickSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSeriesRef = useRef<{ macd: ISeriesApi<'Line'>; signal: ISeriesApi<'Line'>; histogram: ISeriesApi<'Histogram'> } | null>(null);
  const stochasticSeriesRef = useRef<{ k: ISeriesApi<'Line'>; d: ISeriesApi<'Line'> } | null>(null);
  const atrSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const currentCandleRef = useRef<CandleData | null>(null);
  const candlesRef = useRef<CandleData[]>([]);
  const lastCandleTimeRef = useRef<number>(0);
  const initializedKeyRef = useRef<string | null>(null);
  const lastPriceRef = useRef<number>(0);

  // Get settings from store (shared with MobileChartSettingsSheet)
  const {
    selectedTimeframe,
    setTimeframe: setSelectedTimeframe,
    indicators,
    toggleIndicator,
    updateIndicatorParams,
    chartType,
    setChartType,
    showVolume,
    toggleVolume,
    drawingTool,
    setDrawingTool,
    drawnLines: storeDrawnLines,
    addDrawnLine: storeAddDrawnLine,
    undoDrawing: storeUndoDrawing,
    clearDrawings: storeClearDrawings,
    // Templates
    activeTemplateId,
    applyTemplate,
    // Price Alerts
    priceAlerts: storePriceAlerts,
    addPriceAlert: storeAddPriceAlert,
    removePriceAlert: storeRemovePriceAlert,
    clearPriceAlerts: storeClearPriceAlerts,
  } = useChartStore();

  // Local UI state
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [showTimeframeMenu, setShowTimeframeMenu] = useState(false);
  const [showMobileIndicatorSheet, setShowMobileIndicatorSheet] = useState(false);
  const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
  const [ohlcInfo, setOhlcInfo] = useState<OHLCInfo | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showDrawingMenu, setShowDrawingMenu] = useState(false);
  const drawingPointsRef = useRef<{ time: Time; value: number }[]>([]);

  // Filter drawings by current symbol from store
  const drawnLines = storeDrawnLines.filter((d) => d.symbol === symbol);

  // Filter price alerts by current symbol
  const priceAlerts = storePriceAlerts.filter((a) => a.symbol === symbol);

  // Template menu state
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Price alert lines ref
  const priceAlertLinesRef = useRef<Map<string, IPriceLine>>(new Map());

  // Professional chart features state
  const [candleCountdown, setCandleCountdown] = useState<number>(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'none'>('none');
  const [isPulsing, setIsPulsing] = useState(false);
  const [flashClass, setFlashClass] = useState<string>('');
  const [magnetMode, setMagnetMode] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const prevPriceRef = useRef<number>(0);

  // Trade markers refs
  const tradePriceLinesRef = useRef<Map<string, { entry: IPriceLine | undefined; target: IPriceLine | undefined }>>(new Map());

  // Trade marker positions state (Pocket Option style - positioned at entry price)
  const [tradeMarkerPositions, setTradeMarkerPositions] = useState<Map<string, number>>(new Map());

  // Hydration check - prevent SSR mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Get active trades for the current symbol (only after hydration)
  // Using filtered trades by account type
  const filteredActiveTrades = useFilteredActiveTrades();
  const activeTrades = isClient ? filteredActiveTrades.filter((t) => t.symbol === symbol) : [];

  // Volume series ref
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeDataRef = useRef<{ time: Time; value: number; color: string }[]>([]);

  // Drawing tools refs
  const drawnSeriesRef = useRef<Map<string, ISeriesApi<SeriesType>[]>>(new Map());
  const horizontalLinesRef = useRef<Map<string, { priceLine: IPriceLine; price: number }>>(new Map());
  const drawingStartRef = useRef<{ time: Time; value: number } | null>(null);
  const previewSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);

  // Expose undo/clear methods to parent via ref
  useImperativeHandle(ref, () => ({
    undoDrawing: () => {
      if (drawnLines.length === 0) return;
      const lastLine = drawnLines[drawnLines.length - 1];
      const chart = chartRef.current;

      // Remove the series from the chart
      if (chart && lastLine) {
        if (lastLine.type === 'horizontal') {
          const lineData = horizontalLinesRef.current.get(lastLine.id);
          if (lineData && candlestickSeriesRef.current) {
            candlestickSeriesRef.current.removePriceLine(lineData.priceLine);
          }
          horizontalLinesRef.current.delete(lastLine.id);
        } else {
          const series = drawnSeriesRef.current.get(lastLine.id);
          if (series) {
            series.forEach(s => chart.removeSeries(s));
          }
          drawnSeriesRef.current.delete(lastLine.id);
        }
      }

      storeUndoDrawing(symbol);
    },
    clearDrawings: () => {
      const chart = chartRef.current;
      if (chart) {
        // Remove all line series
        drawnSeriesRef.current.forEach((series) => {
          series.forEach(s => chart.removeSeries(s));
        });
        drawnSeriesRef.current.clear();

        // Remove all horizontal price lines
        horizontalLinesRef.current.forEach((lineData) => {
          if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.removePriceLine(lineData.priceLine);
          }
        });
        horizontalLinesRef.current.clear();
      }

      storeClearDrawings(symbol);
      setDrawingTool('none');
    },
  }), [drawnLines, symbol, storeUndoDrawing, storeClearDrawings, setDrawingTool]);

  // Notify parent of drawings count changes
  useEffect(() => {
    onDrawingsChange?.(drawnLines.length);
  }, [drawnLines.length, onDrawingsChange]);

  // Render price alert lines on chart
  useEffect(() => {
    const mainSeries = mainSeriesRef.current;
    if (!mainSeries) return;

    // Remove old alert lines that are no longer in the list
    const currentAlertIds = new Set(priceAlerts.map((a) => a.id));
    priceAlertLinesRef.current.forEach((priceLine, alertId) => {
      if (!currentAlertIds.has(alertId)) {
        try {
          mainSeries.removePriceLine(priceLine);
        } catch {
          // Line may already be removed
        }
        priceAlertLinesRef.current.delete(alertId);
      }
    });

    // Add new alert lines
    priceAlerts.forEach((alert) => {
      if (!priceAlertLinesRef.current.has(alert.id)) {
        const priceLine = mainSeries.createPriceLine({
          price: alert.price,
          color: alert.triggered ? '#6b7280' : '#f59e0b',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: alert.triggered ? 'Triggered' : 'Alert',
        });
        priceAlertLinesRef.current.set(alert.id, priceLine);
      }
    });
  }, [priceAlerts]);

  const candleInterval = selectedTimeframe.seconds;

  const hasRSI = indicators.find((i) => i.id === 'rsi')?.enabled;
  const hasMACD = indicators.find((i) => i.id === 'macd')?.enabled;
  const hasStochastic = indicators.find((i) => i.id === 'stochastic')?.enabled;
  const hasATR = indicators.find((i) => i.id === 'atr')?.enabled;
  const activeIndicatorCount = indicators.filter((i) => i.enabled).length;

  const getCandleTime = useCallback(
    (timestamp: string | Date): number => {
      const time = new Date(timestamp).getTime() / 1000;
      return Math.floor(time / candleInterval) * candleInterval;
    },
    [candleInterval]
  );

  // toggleIndicator is now provided by useChartStore

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

  // Screenshot export function
  const handleScreenshot = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    try {
      const canvas = chart.takeScreenshot();
      if (canvas) {
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          if (blob) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `${symbol.replace('/', '-')}_${selectedTimeframe.label}_${timestamp}.png`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }
        }, 'image/png');
      }
    } catch (error) {
      console.error('Screenshot failed:', error);
    }
  }, [symbol, selectedTimeframe.label]);

  // Update all indicator series
  const updateIndicators = useCallback(
    (candles: CandleData[]) => {
      if (candles.length < 30) return;

      const indicatorData = toIndicatorFormat(candles);

      indicators.forEach((indicator) => {
        if (!indicator.enabled) return;

        const params = indicator.parameters;

        // SMA
        if (indicator.id === 'sma') {
          const period = params.period || 20;
          const smaData = calculateSMA(indicatorData, period);
          const series = indicatorSeriesRef.current.get('sma');
          if (series && smaData.length > 0) {
            series.setData(smaData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        // EMA (9)
        if (indicator.id === 'ema') {
          const period = params.period || 9;
          const emaData = calculateEMA(indicatorData, period);
          const series = indicatorSeriesRef.current.get('ema');
          if (series && emaData.length > 0) {
            series.setData(emaData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        // EMA (21)
        if (indicator.id === 'ema21') {
          const period = params.period || 21;
          const emaData = calculateEMA(indicatorData, period);
          const series = indicatorSeriesRef.current.get('ema21');
          if (series && emaData.length > 0) {
            series.setData(emaData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        // Bollinger Bands
        if (indicator.id === 'bollinger') {
          const period = params.period || 20;
          const stdDev = params.stdDev || 2;
          const bbData = calculateBollingerBands(indicatorData, period, stdDev);
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

        // VWAP
        if (indicator.id === 'vwap') {
          const candlesWithVolume: CandleDataWithVolume[] = indicatorData.map((c, idx) => ({
            ...c,
            volume: candles[idx]?.volume || 1,
          }));
          const vwapData = calculateVWAP(candlesWithVolume);
          const series = indicatorSeriesRef.current.get('vwap');
          if (series && vwapData.length > 0) {
            series.setData(vwapData.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        // Ichimoku Cloud
        if (indicator.id === 'ichimoku') {
          const tenkan = params.tenkan || 9;
          const kijun = params.kijun || 26;
          const senkou = params.senkou || 52;
          const ichimokuData = getIchimokuCloudData(indicatorData, tenkan, kijun, senkou, kijun);

          const tenkanSeries = indicatorSeriesRef.current.get('ichimoku_tenkan');
          const kijunSeries = indicatorSeriesRef.current.get('ichimoku_kijun');
          const senkouASeries = indicatorSeriesRef.current.get('ichimoku_senkouA');
          const senkouBSeries = indicatorSeriesRef.current.get('ichimoku_senkouB');
          const chikouSeries = indicatorSeriesRef.current.get('ichimoku_chikou');

          if (tenkanSeries && ichimokuData.tenkan.length > 0) {
            tenkanSeries.setData(ichimokuData.tenkan.map((d) => ({ time: d.time as Time, value: d.value })));
          }
          if (kijunSeries && ichimokuData.kijun.length > 0) {
            kijunSeries.setData(ichimokuData.kijun.map((d) => ({ time: d.time as Time, value: d.value })));
          }
          if (senkouASeries && ichimokuData.senkouA.length > 0) {
            senkouASeries.setData(ichimokuData.senkouA.map((d) => ({ time: d.time as Time, value: d.value })));
          }
          if (senkouBSeries && ichimokuData.senkouB.length > 0) {
            senkouBSeries.setData(ichimokuData.senkouB.map((d) => ({ time: d.time as Time, value: d.value })));
          }
          if (chikouSeries && ichimokuData.chikou.length > 0) {
            chikouSeries.setData(ichimokuData.chikou.map((d) => ({ time: d.time as Time, value: d.value })));
          }
        }

        // RSI
        if (indicator.id === 'rsi' && rsiSeriesRef.current) {
          const period = params.period || 14;
          const rsiData = calculateRSI(indicatorData, period);
          if (rsiData.length > 0) {
            rsiSeriesRef.current.setData(
              rsiData.map((d) => ({ time: d.time as Time, value: d.value }))
            );
          }
        }

        // MACD
        if (indicator.id === 'macd' && macdSeriesRef.current) {
          const fast = params.fast || 12;
          const slow = params.slow || 26;
          const signal = params.signal || 9;
          const macdData = calculateMACD(indicatorData, fast, slow, signal);
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

        // Stochastic
        if (indicator.id === 'stochastic' && stochasticSeriesRef.current) {
          const kPeriod = params.kPeriod || 14;
          const kSmooth = params.kSmooth || 3;
          const dSmooth = params.dSmooth || 3;
          const stochData = calculateStochastic(indicatorData, kPeriod, kSmooth, dSmooth);
          if (stochData.length > 0) {
            stochasticSeriesRef.current.k.setData(
              stochData.map((d) => ({ time: d.time as Time, value: d.k }))
            );
            stochasticSeriesRef.current.d.setData(
              stochData.map((d) => ({ time: d.time as Time, value: d.d }))
            );
          }
        }

        // ATR
        if (indicator.id === 'atr' && atrSeriesRef.current) {
          const period = params.period || 14;
          const atrData = calculateATR(indicatorData, period);
          if (atrData.length > 0) {
            atrSeriesRef.current.setData(
              atrData.map((d) => ({ time: d.time as Time, value: d.value }))
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
        vertLines: { color: 'rgba(42, 46, 57, 0.25)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(42, 46, 57, 0.25)', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { width: 1, color: '#4b5563', style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
        horzLine: { width: 1, color: '#4b5563', style: LineStyle.Dashed, labelBackgroundColor: '#374151' },
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

      // Bollinger Bands (3 lines)
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
      }
      // Ichimoku Cloud (5 lines)
      else if (indicator.id === 'ichimoku') {
        const tenkanKey = 'ichimoku_tenkan';
        const kijunKey = 'ichimoku_kijun';
        const senkouAKey = 'ichimoku_senkouA';
        const senkouBKey = 'ichimoku_senkouB';
        const chikouKey = 'ichimoku_chikou';

        if (indicator.enabled) {
          if (!indicatorSeriesRef.current.has(tenkanKey)) {
            // Tenkan-sen (Conversion Line) - Red
            const tenkan = chart.addSeries(LineSeries, {
              color: '#ef4444',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            // Kijun-sen (Base Line) - Blue
            const kijun = chart.addSeries(LineSeries, {
              color: '#3b82f6',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            // Senkou Span A (Leading Span A) - Green
            const senkouA = chart.addSeries(LineSeries, {
              color: '#22c55e',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            // Senkou Span B (Leading Span B) - Red/Light
            const senkouB = chart.addSeries(LineSeries, {
              color: '#f97316',
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            // Chikou Span (Lagging Span) - Purple
            const chikou = chart.addSeries(LineSeries, {
              color: '#a855f7',
              lineWidth: 1,
              lineStyle: 2,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorSeriesRef.current.set(tenkanKey, tenkan);
            indicatorSeriesRef.current.set(kijunKey, kijun);
            indicatorSeriesRef.current.set(senkouAKey, senkouA);
            indicatorSeriesRef.current.set(senkouBKey, senkouB);
            indicatorSeriesRef.current.set(chikouKey, chikou);
          }
        } else {
          [tenkanKey, kijunKey, senkouAKey, senkouBKey, chikouKey].forEach((key) => {
            const series = indicatorSeriesRef.current.get(key);
            if (series) {
              chart.removeSeries(series);
              indicatorSeriesRef.current.delete(key);
            }
          });
        }
      }
      // Simple overlay indicators (SMA, EMA, VWAP, etc.)
      else {
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

  // Update crosshair mode when magnet mode changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      crosshair: {
        mode: magnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal,
      },
    });
  }, [magnetMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const chart = chartRef.current;
      if (!chart) return;

      const timeScale = chart.timeScale();

      switch (e.key) {
        case '+':
        case '=':
          // Zoom in
          e.preventDefault();
          const currentBarSpacingIn = timeScale.options().barSpacing || 8;
          timeScale.applyOptions({ barSpacing: Math.min(currentBarSpacingIn + 2, 30) });
          break;
        case '-':
          // Zoom out
          e.preventDefault();
          const currentBarSpacingOut = timeScale.options().barSpacing || 8;
          timeScale.applyOptions({ barSpacing: Math.max(currentBarSpacingOut - 2, 2) });
          break;
        case 'ArrowLeft':
          // Scroll left
          e.preventDefault();
          timeScale.scrollToPosition(timeScale.scrollPosition() - 5, false);
          break;
        case 'ArrowRight':
          // Scroll right
          e.preventDefault();
          timeScale.scrollToPosition(timeScale.scrollPosition() + 5, false);
          break;
        case 'Escape':
          // Cancel drawing
          if (drawingTool !== 'none') {
            setDrawingTool('none');
            drawingStartRef.current = null;
            setIsDrawing(false);
          }
          break;
        case 'z':
          // Undo last drawing (Ctrl+Z)
          if ((e.ctrlKey || e.metaKey) && drawnLines.length > 0) {
            e.preventDefault();
            const lastLine = drawnLines[drawnLines.length - 1];
            if (lastLine) {
              if (lastLine.type === 'horizontal') {
                const lineData = horizontalLinesRef.current.get(lastLine.id);
                if (lineData) {
                  try { mainSeriesRef.current?.removePriceLine(lineData.priceLine); } catch { /* ignore */ }
                  horizontalLinesRef.current.delete(lastLine.id);
                }
              } else {
                const series = drawnSeriesRef.current.get(lastLine.id);
                if (series) {
                  series.forEach(s => {
                    try { chart.removeSeries(s); } catch { /* ignore */ }
                  });
                  drawnSeriesRef.current.delete(lastLine.id);
                }
              }
              storeUndoDrawing(symbol);
            }
          }
          break;
        case 'Delete':
        case 'Backspace':
          // Clear all drawings (when not in input)
          if (drawnLines.length > 0 && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            // Clear all drawings
            drawnLines.forEach(line => {
              if (line.type === 'horizontal') {
                const lineData = horizontalLinesRef.current.get(line.id);
                if (lineData) {
                  try { mainSeriesRef.current?.removePriceLine(lineData.priceLine); } catch { /* ignore */ }
                }
              } else {
                const series = drawnSeriesRef.current.get(line.id);
                if (series) {
                  series.forEach(s => {
                    try { chart.removeSeries(s); } catch { /* ignore */ }
                  });
                }
              }
            });
            drawnSeriesRef.current.clear();
            horizontalLinesRef.current.clear();
            storeClearDrawings(symbol);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingTool, drawnLines, symbol, storeUndoDrawing, storeClearDrawings, setDrawingTool]);

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

  // Initialize Stochastic chart
  useEffect(() => {
    if (!hasStochastic || !stochasticContainerRef.current) {
      if (stochasticChartRef.current) {
        stochasticChartRef.current.remove();
        stochasticChartRef.current = null;
        stochasticSeriesRef.current = null;
      }
      return;
    }

    const chart = createChart(stochasticContainerRef.current, {
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

    const stochConfig = indicators.find((i) => i.id === 'stochastic');

    const kSeries = chart.addSeries(LineSeries, {
      color: stochConfig?.color || '#a78bfa',
      lineWidth: 2,
      priceLineVisible: false,
    });

    const dSeries = chart.addSeries(LineSeries, {
      color: stochConfig?.secondaryColor || '#f472b6',
      lineWidth: 2,
      priceLineVisible: false,
    });

    // Add overbought/oversold levels (20 and 80)
    kSeries.createPriceLine({ price: 80, color: '#ef4444', lineWidth: 1, lineStyle: 2 });
    kSeries.createPriceLine({ price: 20, color: '#22c55e', lineWidth: 1, lineStyle: 2 });
    kSeries.createPriceLine({ price: 50, color: '#6b7280', lineWidth: 1, lineStyle: 2 });

    stochasticChartRef.current = chart;
    stochasticSeriesRef.current = { k: kSeries, d: dSeries };

    // Sync time scale with main chart
    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && stochasticChartRef.current) {
          stochasticChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const handleResize = () => {
      if (stochasticContainerRef.current && stochasticChartRef.current) {
        stochasticChartRef.current.applyOptions({
          width: stochasticContainerRef.current.clientWidth,
          height: stochasticContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(stochasticContainerRef.current);
    handleResize();

    // Update with current data
    if (candlesRef.current.length > 0) {
      updateIndicators(candlesRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (stochasticChartRef.current) {
        stochasticChartRef.current.remove();
        stochasticChartRef.current = null;
        stochasticSeriesRef.current = null;
      }
    };
  }, [hasStochastic, updateIndicators, indicators]);

  // Initialize ATR chart
  useEffect(() => {
    if (!hasATR || !atrContainerRef.current) {
      if (atrChartRef.current) {
        atrChartRef.current.remove();
        atrChartRef.current = null;
        atrSeriesRef.current = null;
      }
      return;
    }

    const chart = createChart(atrContainerRef.current, {
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

    const atrConfig = indicators.find((i) => i.id === 'atr');

    const atrSeries = chart.addSeries(LineSeries, {
      color: atrConfig?.color || '#f472b6',
      lineWidth: 2,
      priceLineVisible: false,
    });

    atrChartRef.current = chart;
    atrSeriesRef.current = atrSeries;

    // Sync time scale with main chart
    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range && atrChartRef.current) {
          atrChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const handleResize = () => {
      if (atrContainerRef.current && atrChartRef.current) {
        atrChartRef.current.applyOptions({
          width: atrContainerRef.current.clientWidth,
          height: atrContainerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(atrContainerRef.current);
    handleResize();

    // Update with current data
    if (candlesRef.current.length > 0) {
      updateIndicators(candlesRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (atrChartRef.current) {
        atrChartRef.current.remove();
        atrChartRef.current = null;
        atrSeriesRef.current = null;
      }
    };
  }, [hasATR, updateIndicators, indicators]);

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
    let newSeries: ISeriesApi<SeriesType>;

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
      const now = Date.now();

      if (drawingTool === 'horizontal') {
        // Horizontal line using createPriceLine - persists across timeframe changes
        const lineId = `horizontal-${now}`;

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
          storeAddDrawnLine({
            id: lineId,
            type: 'horizontal',
            symbol,
            points: [{ time: clickPoint.time as number, value: clickPoint.value }],
            color: '#f59e0b',
            createdAt: now,
          });
        }
        setDrawingTool('none');

      } else if (drawingTool === 'trendline') {
        // Trend line - needs two clicks, draws through exact points then extends right
        if (!drawingStartRef.current) {
          drawingStartRef.current = clickPoint;
          setIsDrawing(true);
          console.log('[TRENDLINE] First click captured:', {
            time: clickPoint.time,
            value: clickPoint.value,
            rawY: param.point?.y,
          });
        } else {
          console.log('[TRENDLINE] Second click captured:', {
            time: clickPoint.time,
            value: clickPoint.value,
            rawY: param.point?.y,
          });
          // Ensure times are different to avoid chart assertion error
          const startTime = drawingStartRef.current.time as number;
          const endTime = clickPoint.time as number;

          if (startTime === endTime) {
            // Can't draw on same candle - reset and ignore
            drawingStartRef.current = null;
            setIsDrawing(false);
            return;
          }

          const lineId = `trendline-${now}`;
          const lineSeries = chart.addSeries(LineSeries, {
            color: '#8b5cf6',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceScaleId: 'right', // Use same scale as main series
          });

          // Store exact clicked points
          const point1Time = drawingStartRef.current.time as number;
          const point1Value = drawingStartRef.current.value;
          const point2Time = clickPoint.time as number;
          const point2Value = clickPoint.value;

          // Sort points by time
          let p1: { time: number; value: number };
          let p2: { time: number; value: number };
          if (point1Time < point2Time) {
            p1 = { time: point1Time, value: point1Value };
            p2 = { time: point2Time, value: point2Value };
          } else {
            p1 = { time: point2Time, value: point2Value };
            p2 = { time: point1Time, value: point1Value };
          }

          // Calculate slope from the two exact points
          const timeDiff = p2.time - p1.time;
          const valueDiff = p2.value - p1.value;
          const slope = valueDiff / timeDiff;

          // Get candle interval for extension calculation
          const candleInterval = candlesRef.current.length > 1
            ? Math.abs((candlesRef.current[1]?.time as number) - (candlesRef.current[0]?.time as number))
            : 60;

          // Check if line is steep (angle > 60 degrees approximately)
          // slope = price_change / time_change, so steep means large |slope * candleInterval|
          const pricePerCandle = Math.abs(slope * candleInterval);
          const avgCandleHeight = Math.abs(valueDiff) / Math.max(1, Math.abs(timeDiff) / candleInterval);
          const isSteep = pricePerCandle > avgCandleHeight * 0.5 || Math.abs(timeDiff) < candleInterval * 5;

          let lineData: { time: Time; value: number }[];

          if (isSteep) {
            // For steep lines, extend only slightly to keep line visible
            // Calculate extension that won't go too far off screen
            const extendCandles = 10;
            const extendTime = p2.time + (candleInterval * extendCandles);
            const rawExtendValue = p1.value + slope * (extendTime - p1.time);

            // Clamp extension to reasonable bounds (3x the original price range from the line)
            const priceRange = Math.abs(valueDiff);
            const buffer = Math.max(priceRange * 3, avgCandleHeight * 10);
            const minPrice = Math.min(p1.value, p2.value) - buffer;
            const maxPrice = Math.max(p1.value, p2.value) + buffer;
            const clampedExtendValue = Math.max(minPrice, Math.min(maxPrice, rawExtendValue));

            lineData = [
              { time: p1.time as Time, value: p1.value },
              { time: extendTime as Time, value: clampedExtendValue },
            ];
          } else {
            // Normal trendline - extend to the right by 50 candles
            const extendTime = p2.time + (candleInterval * 50);
            const extendValue = p1.value + slope * (extendTime - p1.time);

            lineData = [
              { time: p1.time as Time, value: p1.value },
              { time: extendTime as Time, value: extendValue },
            ];
          }

          console.log('[TRENDLINE] Drawing line:', {
            clickedPoint1: { time: p1.time, value: p1.value },
            clickedPoint2: { time: p2.time, value: p2.value },
            slope,
            isSteep,
            lineData,
          });
          lineSeries.setData(lineData);

          drawnSeriesRef.current.set(lineId, [lineSeries]);
          storeAddDrawnLine({
            id: lineId,
            type: 'trendline',
            symbol,
            points: [
              { time: point1Time, value: point1Value },
              { time: point2Time, value: point2Value },
            ],
            color: '#8b5cf6',
            createdAt: now,
          });
          drawingStartRef.current = null;
          setIsDrawing(false);
          // Keep tool active for multiple drawings
        }

      } else if (drawingTool === 'fibonacci') {
        // Fibonacci - needs two clicks for high/low
        if (!drawingStartRef.current) {
          drawingStartRef.current = clickPoint;
          setIsDrawing(true);
        } else {
          const startTime = drawingStartRef.current.time as number;
          const endTime = clickPoint.time as number;

          if (startTime === endTime) {
            drawingStartRef.current = null;
            setIsDrawing(false);
            return;
          }

          const lineId = `fibonacci-${now}`;
          const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const fibColors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6', '#ef4444'];
          const fibSeries: ISeriesApi<any>[] = [];

          const highValue = Math.max(drawingStartRef.current.value, clickPoint.value);
          const lowValue = Math.min(drawingStartRef.current.value, clickPoint.value);
          const range = highValue - lowValue;

          // Use clicked points' time range and extend to the right (professional Fibonacci)
          const leftTime = Math.min(startTime, endTime) as Time;
          // Extend to the right by 50% of the original time range for professional look
          const timeRange = Math.abs(endTime - startTime);
          const rightTime = (Math.max(startTime, endTime) + timeRange * 0.5) as Time;

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

            series.setData([
              { time: leftTime, value: levelValue },
              { time: rightTime, value: levelValue },
            ]);
            fibSeries.push(series);
          });

          drawnSeriesRef.current.set(lineId, fibSeries);
          storeAddDrawnLine({
            id: lineId,
            type: 'fibonacci',
            symbol,
            points: [
              { time: drawingStartRef.current.time as number, value: drawingStartRef.current.value },
              { time: clickPoint.time as number, value: clickPoint.value },
            ],
            color: '#6366f1',
            createdAt: now,
          });

          drawingStartRef.current = null;
          setIsDrawing(false);
          // Keep tool active for multiple drawings
        }

      } else if (drawingTool === 'ray') {
        // Ray - needs two clicks, extends to the right
        if (!drawingStartRef.current) {
          drawingStartRef.current = clickPoint;
          setIsDrawing(true);
        } else {
          const startTime = drawingStartRef.current.time as number;
          const endTime = clickPoint.time as number;

          if (startTime === endTime) {
            drawingStartRef.current = null;
            setIsDrawing(false);
            return;
          }

          const lineId = `ray-${now}`;
          const lineSeries = chart.addSeries(LineSeries, {
            color: '#06b6d4',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          // Calculate slope and extend to far future
          const slope = (clickPoint.value - drawingStartRef.current.value) / (endTime - startTime);
          const futureTime = endTime + (86400 * 365); // Extend 1 year into future
          const futureValue = clickPoint.value + slope * (futureTime - endTime);

          const sortedData = [
            { time: drawingStartRef.current.time, value: drawingStartRef.current.value },
            { time: futureTime as Time, value: futureValue },
          ].sort((a, b) => (a.time as number) - (b.time as number));

          lineSeries.setData(sortedData);

          drawnSeriesRef.current.set(lineId, [lineSeries]);
          storeAddDrawnLine({
            id: lineId,
            type: 'ray',
            symbol,
            points: [
              { time: drawingStartRef.current.time as number, value: drawingStartRef.current.value },
              { time: clickPoint.time as number, value: clickPoint.value },
            ],
            color: '#06b6d4',
            createdAt: now,
          });
          drawingStartRef.current = null;
          setIsDrawing(false);
          // Keep tool active for multiple drawings
        }

      } else if (drawingTool === 'rectangle') {
        // Rectangle/Zone - needs two clicks for corners (with semi-transparent fill)
        if (!drawingStartRef.current) {
          drawingStartRef.current = clickPoint;
          setIsDrawing(true);
        } else {
          const startTime = drawingStartRef.current.time as number;
          const endTime = clickPoint.time as number;

          if (startTime === endTime) {
            drawingStartRef.current = null;
            setIsDrawing(false);
            return;
          }

          const lineId = `rectangle-${now}`;
          const rectSeries: ISeriesApi<any>[] = [];
          const rectColor = '#22c55e';
          const topValue = Math.max(drawingStartRef.current.value, clickPoint.value);
          const bottomValue = Math.min(drawingStartRef.current.value, clickPoint.value);
          const leftTime = Math.min(startTime, endTime) as Time;
          const rightTime = Math.max(startTime, endTime) as Time;

          // Semi-transparent fill using AreaSeries (professional rectangle)
          // Create area between top and bottom values
          const fillSeries = chart.addSeries(AreaSeries, {
            topColor: 'rgba(34, 197, 94, 0.25)',
            bottomColor: 'rgba(34, 197, 94, 0.08)',
            lineColor: 'transparent',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });

          // Create fill data spanning the rectangle area
          // Use multiple points to fill the area properly
          const fillData = [];
          const timeStep = Math.abs(endTime - startTime) / 10;
          for (let i = 0; i <= 10; i++) {
            const t = (leftTime as number) + i * timeStep;
            fillData.push({ time: t as Time, value: topValue });
          }
          fillSeries.setData(fillData);
          rectSeries.push(fillSeries);

          // Top border line
          const topSeries = chart.addSeries(LineSeries, {
            color: rectColor,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          topSeries.setData([
            { time: leftTime, value: topValue },
            { time: rightTime, value: topValue },
          ]);
          rectSeries.push(topSeries);

          // Bottom border line
          const bottomSeries = chart.addSeries(LineSeries, {
            color: rectColor,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          bottomSeries.setData([
            { time: leftTime, value: bottomValue },
            { time: rightTime, value: bottomValue },
          ]);
          rectSeries.push(bottomSeries);

          // Left border line
          const leftSeries = chart.addSeries(LineSeries, {
            color: rectColor,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          leftSeries.setData([
            { time: leftTime, value: bottomValue },
            { time: leftTime, value: topValue },
          ]);
          rectSeries.push(leftSeries);

          // Right border line
          const rightSeries = chart.addSeries(LineSeries, {
            color: rectColor,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          rightSeries.setData([
            { time: rightTime, value: bottomValue },
            { time: rightTime, value: topValue },
          ]);
          rectSeries.push(rightSeries);

          drawnSeriesRef.current.set(lineId, rectSeries);
          storeAddDrawnLine({
            id: lineId,
            type: 'rectangle',
            symbol,
            points: [
              { time: drawingStartRef.current.time as number, value: drawingStartRef.current.value },
              { time: clickPoint.time as number, value: clickPoint.value },
            ],
            color: rectColor,
            createdAt: now,
          });
          drawingStartRef.current = null;
          setIsDrawing(false);
          // Keep tool active for multiple drawings
        }
      }
    };

    chart.subscribeClick(handleClick);

    return () => {
      chart.unsubscribeClick(handleClick);
    };
  }, [drawingTool]);

  // Preview line while drawing (professional visual feedback)
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return;

    const chart = chartRef.current;
    let previewCreated = false;
    let rafId: number | null = null;
    let pendingData: { time: Time; value: number }[] | null = null;

    const updatePreview = () => {
      rafId = null;
      if (!previewSeriesRef.current || !pendingData) return;
      try {
        previewSeriesRef.current.setData(pendingData);
      } catch (e) {
        // Ignore errors
      }
      pendingData = null;
    };

    const handleCrosshairMove = (param: MouseEventParams) => {
      // Only show preview when drawing is in progress (first click done)
      if (!isDrawing || !drawingStartRef.current || !param.point || !param.time) {
        // Schedule clear if preview exists
        if (previewSeriesRef.current && previewCreated) {
          pendingData = [];
          if (!rafId) rafId = requestAnimationFrame(updatePreview);
        }
        return;
      }

      // Skip for horizontal line (single click tool)
      if (drawingTool === 'horizontal') return;

      const price = mainSeriesRef.current?.coordinateToPrice(param.point.y);
      if (price === null || price === undefined) return;

      const startTime = drawingStartRef.current.time as number;
      const endTime = param.time as number;

      // Skip if same time (prevents chart errors)
      if (startTime === endTime) return;

      // Create preview series once if doesn't exist
      if (!previewSeriesRef.current || !previewCreated) {
        const previewColor = drawingTool === 'trendline' ? '#8b5cf6' :
                            drawingTool === 'ray' ? '#06b6d4' :
                            drawingTool === 'fibonacci' ? '#6366f1' :
                            drawingTool === 'rectangle' ? '#22c55e' : '#ffffff';

        previewSeriesRef.current = chart.addSeries(LineSeries, {
          color: previewColor,
          lineWidth: 1,
          lineStyle: 2, // Dashed for preview
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        previewCreated = true;
      }

      // Sort times for proper rendering and schedule update
      pendingData = [
        { time: drawingStartRef.current.time, value: drawingStartRef.current.value },
        { time: param.time as Time, value: price },
      ].sort((a, b) => (a.time as number) - (b.time as number));

      // Use requestAnimationFrame to batch updates and prevent recursion
      if (!rafId) rafId = requestAnimationFrame(updatePreview);
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      if (rafId) cancelAnimationFrame(rafId);
      // Clean up preview on unmount
      if (previewSeriesRef.current && previewCreated) {
        try {
          chart.removeSeries(previewSeriesRef.current);
        } catch (e) {
          // Ignore
        }
        previewSeriesRef.current = null;
      }
    };
  }, [isDrawing, drawingTool]);

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

    // Clear visual refs - store drawings persist and will be redrawn
    drawnSeriesRef.current.clear();
    horizontalLinesRef.current.clear();
    setDrawingTool('none');
    drawingStartRef.current = null;
    setIsDrawing(false);
  }, [symbol, candleInterval, chartType, setDrawingTool]);

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

  // ============================================
  // PROFESSIONAL CHART FEATURES
  // ============================================

  // Candle Countdown Timer Effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = candleInterval - (now % candleInterval);
      setCandleCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [candleInterval]);

  // Price Direction Detection & Animation Effect
  useEffect(() => {
    if (!currentPrice) return;

    const price = currentPrice.price;
    const prevPrice = prevPriceRef.current;

    if (prevPrice !== 0 && price !== prevPrice) {
      // Determine direction
      const direction = price > prevPrice ? 'up' : 'down';
      setPriceDirection(direction);

      // Trigger pulse animation
      setIsPulsing(true);
      const pulseTimeout = setTimeout(() => setIsPulsing(false), 400);

      // Trigger flash animation
      setFlashClass(direction === 'up' ? 'animate-flash-up' : 'animate-flash-down');
      const flashTimeout = setTimeout(() => setFlashClass(''), 250);

      prevPriceRef.current = price;

      return () => {
        clearTimeout(pulseTimeout);
        clearTimeout(flashTimeout);
      };
    } else if (prevPrice === 0) {
      prevPriceRef.current = price;
    }
  }, [currentPrice]);

  // Trade Entry Markers Effect
  useEffect(() => {
    if (!mainSeriesRef.current || !isClient) return;

    // Filter out any invalid trades and get current trade IDs
    const validTrades = activeTrades.filter(t => t && t.id && typeof t.entryPrice === 'number');
    const currentTradeIds = new Set(validTrades.map(t => t.id));

    // Remove lines for completed/removed trades
    tradePriceLinesRef.current.forEach((lines, tradeId) => {
      if (!currentTradeIds.has(tradeId)) {
        try {
          if (lines.entry) mainSeriesRef.current?.removePriceLine(lines.entry);
          if (lines.target) mainSeriesRef.current?.removePriceLine(lines.target);
        } catch {
          // Line already removed
        }
        tradePriceLinesRef.current.delete(tradeId);
      }
    });

    // Add lines for new trades
    validTrades.forEach(trade => {
      if (!tradePriceLinesRef.current.has(trade.id) && trade.entryPrice > 0) {
        try {
          const isUp = trade.direction === 'UP';
          const entryColor = isUp ? '#22c55e' : '#ef4444';
          const targetColor = isUp ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';

          // Entry price line - axis label disabled to prevent clutter
          // Trade info shown in horizontal bar at top instead (ChartTradeBar component)
          const entryLine = mainSeriesRef.current?.createPriceLine({
            price: trade.entryPrice,
            color: entryColor,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: false,
            title: '',
          });

          // Target price line (small offset to show direction)
          const targetOffset = trade.entryPrice * 0.0003;
          const targetPrice = isUp
            ? trade.entryPrice + targetOffset
            : trade.entryPrice - targetOffset;

          const targetLine = mainSeriesRef.current?.createPriceLine({
            price: targetPrice,
            color: targetColor,
            lineWidth: 1,
            lineStyle: 3, // Dotted
            axisLabelVisible: false,
            title: '',
          });

          if (entryLine || targetLine) {
            tradePriceLinesRef.current.set(trade.id, {
              entry: entryLine,
              target: targetLine,
            });
          }
        } catch {
          // Failed to create price lines - series might not support it
        }
      }
    });
  }, [activeTrades, symbol, isClient]);

  // Calculate trade marker Y positions (Pocket Option style)
  // Use ref to track active trade IDs to prevent infinite loops
  const activeTradeIdsRef = useRef<string>('');

  useEffect(() => {
    // Create stable ID string to compare
    const tradeIds = activeTrades.map(t => t.id).sort().join(',');

    // Skip if nothing changed
    if (tradeIds === activeTradeIdsRef.current && tradeMarkerPositions.size > 0) {
      return;
    }
    activeTradeIdsRef.current = tradeIds;

    if (!mainSeriesRef.current || !chartRef.current || activeTrades.length === 0) {
      if (tradeMarkerPositions.size > 0) {
        setTradeMarkerPositions(new Map());
      }
      return;
    }

    const calculatePositions = () => {
      const series = mainSeriesRef.current;
      if (!series) return;

      const newPositions = new Map<string, number>();
      let hasChanges = false;

      activeTrades.forEach((trade) => {
        try {
          const y = series.priceToCoordinate(trade.entryPrice);
          if (y !== null && y !== undefined && !isNaN(y) && y > 0) {
            newPositions.set(trade.id, y);
            const oldY = tradeMarkerPositions.get(trade.id);
            if (oldY === undefined || Math.abs(oldY - y) > 1) {
              hasChanges = true;
            }
          }
        } catch {
          // Price might be out of visible range
        }
      });

      // Only update state if positions actually changed
      if (hasChanges || newPositions.size !== tradeMarkerPositions.size) {
        setTradeMarkerPositions(newPositions);
      }
    };

    // Calculate initial positions after a short delay to ensure chart is ready
    const initTimeout = setTimeout(calculatePositions, 100);

    // Subscribe to visible range changes to recalculate positions
    const chart = chartRef.current;
    const timeScale = chart.timeScale();

    let rafId: number | null = null;
    const handleRangeChange = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculatePositions);
    };

    timeScale.subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Recalculate periodically (catches zoom via scroll wheel)
    const recalcInterval = setInterval(calculatePositions, 1000);

    return () => {
      clearTimeout(initTimeout);
      if (rafId) cancelAnimationFrame(rafId);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      clearInterval(recalcInterval);
    };
  }, [activeTrades.length, isClient]); // Only depend on length, not the array reference

  // Group trades by similar Y positions (within 30px) for horizontal arrangement
  const groupedTradeMarkers = useMemo(() => {
    if (activeTrades.length === 0) return [];

    const GROUPING_THRESHOLD = 30; // pixels
    const groups: { y: number; trades: typeof activeTrades }[] = [];

    // Sort trades by creation time (newest first for right-to-left display)
    const sortedTrades = [...activeTrades].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    sortedTrades.forEach((trade) => {
      const y = tradeMarkerPositions.get(trade.id);
      if (y === undefined || y < 0) return;

      // Find existing group within threshold
      const existingGroup = groups.find(
        (g) => Math.abs(g.y - y) <= GROUPING_THRESHOLD
      );

      if (existingGroup) {
        existingGroup.trades.push(trade);
        // Update group Y to average
        const totalY = existingGroup.trades.reduce(
          (sum, t) => sum + (tradeMarkerPositions.get(t.id) || 0),
          0
        );
        existingGroup.y = totalY / existingGroup.trades.length;
      } else {
        groups.push({ y, trades: [trade] });
      }
    });

    return groups;
  }, [activeTrades, tradeMarkerPositions]);

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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

      {/* ============================================
          PROFESSIONAL CHART UI ELEMENTS
          ============================================ */}

      {/* Candle Countdown Timer */}
      {currentPrice && (
        <div className="absolute right-[90px] top-1/2 -translate-y-[60px] z-20">
          <div className={`px-2.5 py-1.5 bg-gradient-to-r from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-lg shadow-lg ${candleCountdown <= 5 ? 'animate-countdown-pulse border-orange-500/50' : ''}`}>
            <div className="flex items-center gap-1.5">
              <svg className={`w-3 h-3 ${candleCountdown <= 5 ? 'text-orange-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-xs font-mono font-bold ${candleCountdown <= 5 ? 'text-orange-400' : 'text-gray-300'}`}>
                {formatCountdown(candleCountdown)}
              </span>
            </div>
          </div>
        </div>
      )}



      {/* Gradient Overlay for Visual Depth */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.02) 0%, transparent 30%, transparent 70%, rgba(239, 68, 68, 0.02) 100%)',
          mixBlendMode: 'overlay',
        }}
      />

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
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      {indicator.enabled && <Check className="h-4 w-4 text-blue-400" />}
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
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      {indicator.enabled && <Check className="h-4 w-4 text-blue-400" />}
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
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-white text-sm font-semibold shadow-lg hover:border-blue-500/50 transition-all backdrop-blur-sm"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="min-w-[28px]">{selectedTimeframe.label}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showTimeframeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showTimeframeMenu && (
            <>
              <div className="fixed inset-0 z-[10]" onClick={() => setShowTimeframeMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-72 bg-gradient-to-b from-[#1e1e38] to-[#151528] border border-[#3d3d5c] rounded-xl shadow-2xl z-20 overflow-hidden backdrop-blur-xl">
                {/* Header */}
                <div className="px-3 py-2 border-b border-[#2d2d44] bg-[#1a1a2e]/50">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Select Timeframe</span>
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
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
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
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
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
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
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
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
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
            title="Indicators"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="md:hidden">Indicators</span>
            {indicators.filter((i) => i.enabled).length > 0 && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-md text-[10px] font-bold shadow-lg shadow-blue-500/30">
                {indicators.filter((i) => i.enabled).length}
              </span>
            )}
          </button>

          {/* Indicator Dropdown Menu */}
          {showIndicatorMenu && (
            <>
              <div className="fixed inset-0 z-[10]" onClick={() => { setShowIndicatorMenu(false); setExpandedIndicator(null); }} />
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a2e] border border-[#2d2d44] rounded-lg shadow-xl overflow-hidden z-20 max-h-[70vh] overflow-y-auto">
                <div className="p-2 border-b border-[#2d2d44]">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Overlays</span>
                </div>
                {indicators
                  .filter((i) => i.type === 'overlay')
                  .map((indicator) => (
                    <div key={indicator.id} className="border-b border-[#2d2d44]/50 last:border-b-0">
                      <div className="flex items-center justify-between px-3 py-2 hover:bg-[#252542] transition-colors">
                        <button
                          onClick={() => toggleIndicator(indicator.id)}
                          className="flex items-center gap-2 flex-1 text-sm text-gray-300"
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: indicator.color }}
                          />
                          <span className="flex-1 text-left">{indicator.name}</span>
                          {indicator.enabled && (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        {Object.keys(indicator.parameters).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedIndicator(expandedIndicator === indicator.id ? null : indicator.id);
                            }}
                            className={`p-1 rounded hover:bg-[#3d3d5c] transition-colors ml-2 ${expandedIndicator === indicator.id ? 'text-blue-400' : 'text-gray-500'}`}
                            title="Settings"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {expandedIndicator === indicator.id && Object.keys(indicator.parameters).length > 0 && (
                        <div className="px-3 pb-2 bg-[#151528] space-y-2">
                          {Object.entries(indicator.parameters).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between gap-2">
                              <label className="text-xs text-gray-400 capitalize">{key}</label>
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 0;
                                  if (newValue > 0) {
                                    updateIndicatorParams(indicator.id, { [key]: newValue });
                                  }
                                }}
                                className="w-16 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#3d3d5c] rounded text-gray-300 focus:outline-none focus:border-blue-500"
                                min="1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                <div className="p-2 border-t border-b border-[#2d2d44]">
                  <span className="text-xs font-semibold text-gray-400 uppercase">Oscillators</span>
                </div>
                {indicators
                  .filter((i) => i.type === 'panel')
                  .map((indicator) => (
                    <div key={indicator.id} className="border-b border-[#2d2d44]/50 last:border-b-0">
                      <div className="flex items-center justify-between px-3 py-2 hover:bg-[#252542] transition-colors">
                        <button
                          onClick={() => toggleIndicator(indicator.id)}
                          className="flex items-center gap-2 flex-1 text-sm text-gray-300"
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: indicator.color }}
                          />
                          <span className="flex-1 text-left">{indicator.name}</span>
                          {indicator.enabled && (
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        {Object.keys(indicator.parameters).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedIndicator(expandedIndicator === indicator.id ? null : indicator.id);
                            }}
                            className={`p-1 rounded hover:bg-[#3d3d5c] transition-colors ml-2 ${expandedIndicator === indicator.id ? 'text-blue-400' : 'text-gray-500'}`}
                            title="Settings"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {expandedIndicator === indicator.id && Object.keys(indicator.parameters).length > 0 && (
                        <div className="px-3 pb-2 bg-[#151528] space-y-2">
                          {Object.entries(indicator.parameters).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between gap-2">
                              <label className="text-xs text-gray-400 capitalize">{key}</label>
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => {
                                  const newValue = parseInt(e.target.value) || 0;
                                  if (newValue > 0) {
                                    updateIndicatorParams(indicator.id, { [key]: newValue });
                                  }
                                }}
                                className="w-16 px-2 py-1 text-xs bg-[#1a1a2e] border border-[#3d3d5c] rounded text-gray-300 focus:outline-none focus:border-blue-500"
                                min="1"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Chart Type Selector */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeMenu(!showChartTypeMenu)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:border-blue-500/50 transition-all shadow-lg backdrop-blur-sm"
            title="Chart Type"
          >
            {getChartTypeIcon(chartType)}
            <span className="md:hidden">{CHART_TYPES.find(ct => ct.id === chartType)?.name}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showChartTypeMenu ? 'rotate-180' : ''}`} />
          </button>

          {showChartTypeMenu && (
            <>
              <div className="fixed inset-0 z-[10]" onClick={() => setShowChartTypeMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-44 bg-gradient-to-b from-[#1e1e38] to-[#151528] border border-[#3d3d5c] rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2d2d44] bg-[#1a1a2e]/50">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Chart Type</span>
                </div>
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => { setChartType(ct.id); setShowChartTypeMenu(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-all ${
                      chartType === ct.id
                        ? 'bg-blue-500/20 text-blue-400'
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

        {/* Templates Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border rounded-xl text-sm font-semibold transition-all shadow-lg backdrop-blur-sm ${
              activeTemplateId
                ? 'border-blue-500/50 text-blue-400'
                : 'border-[#3d3d5c] text-gray-400 hover:text-white hover:border-blue-500/30'
            }`}
            title="Chart Templates"
          >
            <Layout className="w-4 h-4" />
            <ChevronDown className={`h-4 w-4 transition-transform ${showTemplateMenu ? 'rotate-180' : ''}`} />
          </button>

          {showTemplateMenu && (
            <>
              <div className="fixed inset-0 z-[10]" onClick={() => setShowTemplateMenu(false)} />
              <div className="absolute top-full left-0 mt-2 w-52 bg-gradient-to-b from-[#1e1e38] to-[#151528] border border-[#3d3d5c] rounded-xl shadow-2xl z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#2d2d44] bg-[#1a1a2e]/50">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Templates</span>
                </div>
                {CHART_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => { applyTemplate(template.id); setShowTemplateMenu(false); }}
                    className={`w-full flex flex-col items-start px-3 py-2.5 text-sm transition-all ${
                      activeTemplateId === template.id
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-400 hover:bg-[#252542] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{template.name}</span>
                      {activeTemplateId === template.id && <Check className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5">{template.description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Volume Toggle */}
        <button
          onClick={toggleVolume}
          className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border rounded-xl text-sm font-semibold transition-all shadow-lg backdrop-blur-sm ${
            showVolume
              ? 'border-blue-500/50 text-blue-400'
              : 'border-[#3d3d5c] text-gray-400 hover:text-white hover:border-blue-500/30'
          }`}
          title="Toggle Volume"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="md:hidden">Vol</span>
        </button>

        {/* Magnet Mode Toggle */}
        <button
          onClick={() => setMagnetMode(!magnetMode)}
          className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border rounded-xl text-sm font-semibold transition-all shadow-lg backdrop-blur-sm ${
            magnetMode
              ? 'border-blue-500/50 text-blue-400'
              : 'border-[#3d3d5c] text-gray-400 hover:text-white hover:border-blue-500/30'
          }`}
          title="Magnet Mode - Snap crosshair to OHLC values"
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* Screenshot Button */}
        <button
          onClick={handleScreenshot}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:border-blue-500/30 transition-all shadow-lg backdrop-blur-sm"
          title="Download Chart Screenshot"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Drawing Tools Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDrawingMenu(!showDrawingMenu)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm font-medium shadow-lg ${
              drawingTool !== 'none'
                ? 'bg-blue-500/30 text-blue-400 border border-blue-500/50'
                : 'bg-gradient-to-b from-[#1e1e38] to-[#1a1a2e] border border-[#3d3d5c] text-gray-400 hover:text-white'
            }`}
            title="Drawing Tools"
          >
            <PenTool className="w-4 h-4" />
            <span className="md:hidden">
              {drawingTool === 'none' ? 'Draw' :
               drawingTool === 'trendline' ? 'Trend Line' :
               drawingTool === 'horizontal' ? 'H-Line' :
               drawingTool === 'fibonacci' ? 'Fibonacci' :
               drawingTool === 'ray' ? 'Ray' : 'Rectangle'}
            </span>
            {drawnLines.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-400 rounded text-xs font-bold">
                {drawnLines.length}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDrawingMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDrawingMenu && (
            <>
              <div className="fixed inset-0 z-[10]" onClick={() => setShowDrawingMenu(false)} />
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e] border border-[#3d3d5c] rounded-xl shadow-2xl z-[20] overflow-hidden">
                {/* Drawing Tools Section */}
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Drawing Tools</p>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'trendline' ? 'none' : 'trendline');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'trendline'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                    title="Trend Line - Click 2 points"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <div className="flex-1 text-left md:hidden">
                      <div className="text-sm font-medium">Trend Line</div>
                      <div className="text-[10px] text-gray-500">Click 2 points</div>
                    </div>
                    <span className="hidden md:inline text-sm font-medium">Trend Line</span>
                    {drawingTool === 'trendline' && <Check className="w-4 h-4 text-blue-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'horizontal' ? 'none' : 'horizontal');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'horizontal'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                    title="Horizontal Line - Click to place"
                  >
                    <Minus className="w-4 h-4" />
                    <div className="flex-1 text-left md:hidden">
                      <div className="text-sm font-medium">Horizontal Line</div>
                      <div className="text-[10px] text-gray-500">Click to place</div>
                    </div>
                    <span className="hidden md:inline text-sm font-medium">Horizontal Line</span>
                    {drawingTool === 'horizontal' && <Check className="w-4 h-4 text-blue-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'fibonacci' ? 'none' : 'fibonacci');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'fibonacci'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                    title="Fibonacci - Click high & low"
                  >
                    <GitBranch className="w-4 h-4" />
                    <div className="flex-1 text-left md:hidden">
                      <div className="text-sm font-medium">Fibonacci</div>
                      <div className="text-[10px] text-gray-500">Click high & low</div>
                    </div>
                    <span className="hidden md:inline text-sm font-medium">Fibonacci</span>
                    {drawingTool === 'fibonacci' && <Check className="w-4 h-4 text-blue-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'ray' ? 'none' : 'ray');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'ray'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                    title="Ray - Extended trend line"
                  >
                    <TrendingUp className="w-4 h-4 rotate-45" />
                    <div className="flex-1 text-left md:hidden">
                      <div className="text-sm font-medium">Ray</div>
                      <div className="text-[10px] text-gray-500">Extended line</div>
                    </div>
                    <span className="hidden md:inline text-sm font-medium">Ray</span>
                    {drawingTool === 'ray' && <Check className="w-4 h-4 text-blue-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setDrawingTool(drawingTool === 'rectangle' ? 'none' : 'rectangle');
                      setShowDrawingMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      drawingTool === 'rectangle'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-gray-300 hover:bg-[#252542] hover:text-white'
                    }`}
                    title="Rectangle - Click 2 corners"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <div className="flex-1 text-left md:hidden">
                      <div className="text-sm font-medium">Rectangle</div>
                      <div className="text-[10px] text-gray-500">Click 2 corners</div>
                    </div>
                    <span className="hidden md:inline text-sm font-medium">Rectangle</span>
                    {drawingTool === 'rectangle' && <Check className="w-4 h-4 text-blue-400" />}
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
                            storeUndoDrawing(symbol);
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Undo Last</span>
                      </button>

                      {drawnLines.length > 1 && (
                        <button
                          onClick={() => {
                            // Remove all visual elements
                            drawnLines.forEach(line => {
                              if (line.type === 'horizontal') {
                                const lineData = horizontalLinesRef.current.get(line.id);
                                if (lineData) {
                                  try { mainSeriesRef.current?.removePriceLine(lineData.priceLine); } catch { /* ignore */ }
                                }
                              } else {
                                const series = drawnSeriesRef.current.get(line.id);
                                if (series) {
                                  series.forEach(s => {
                                    try { chartRef.current?.removeSeries(s); } catch { /* ignore */ }
                                  });
                                }
                              }
                            });
                            drawnSeriesRef.current.clear();
                            horizontalLinesRef.current.clear();
                            storeClearDrawings(symbol);
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

      {/* Drawing Mode Indicator */}
      {drawingTool !== 'none' && (
        <div className="absolute top-14 left-2 z-10 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 rounded-lg text-orange-400 text-xs font-semibold flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          {drawingTool === 'horizontal' && 'Click chart to place horizontal line'}
          {drawingTool === 'trendline' && (isDrawing ? 'Click second point for trend line' : 'Click first point for trend line')}
          {drawingTool === 'fibonacci' && (isDrawing ? 'Click second point (low/high)' : 'Click first point (high/low)')}
          {drawingTool === 'ray' && (isDrawing ? 'Click second point for ray' : 'Click first point for ray')}
          {drawingTool === 'rectangle' && (isDrawing ? 'Click second corner' : 'Click first corner')}
          <button
            onClick={() => { setDrawingTool('none'); drawingStartRef.current = null; setIsDrawing(false); }}
            className="ml-1 text-orange-300 hover:text-white bg-orange-500/30 rounded p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Chart Container */}
      <div className="relative flex-1" style={{ flex: hasRSI || hasMACD ? '1 1 60%' : '1 1 100%', minHeight: 0 }}>
        <div
          ref={chartContainerRef}
          className="absolute inset-0"
        />

        {/* Trade Markers - Pocket Option Style (positioned at entry price, right-aligned) */}
        {groupedTradeMarkers.map((group, groupIndex) => (
          <div
            key={`trade-group-${groupIndex}`}
            className="absolute z-20 flex items-center gap-1 pointer-events-none"
            style={{
              top: `${group.y}px`,
              right: '90px', // Position from right (before price scale)
              transform: 'translateY(-50%)',
              flexDirection: 'row-reverse', // Newest on right, extends left
            }}
          >
            {group.trades.slice(0, 10).map((trade) => (
              <TradeMarkerPill key={trade.id} trade={trade} currentPrice={currentPrice?.price} />
            ))}
            {group.trades.length > 10 && (
              <div className="flex-shrink-0 px-2 py-1 bg-[#1a1a2e]/90 rounded text-[10px] text-gray-400 font-medium">
                +{group.trades.length - 10}
              </div>
            )}
          </div>
        ))}

        {/* Symbol Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-[1]">
          <span
            className="text-white/[0.04] font-bold tracking-wider"
            style={{ fontSize: 'clamp(32px, 8vw, 72px)' }}
          >
            {symbol.replace('/', ' / ')}
          </span>
        </div>

        {/* Floating Price Badge */}
        {currentPrice && isClient && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className={`
              px-3 py-2 rounded-lg backdrop-blur-sm border shadow-lg transition-all duration-150
              ${priceDirection === 'up' 
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
                : priceDirection === 'down'
                ? 'bg-red-500/20 border-red-500/50 text-red-400'
                : 'bg-[#1a1a2e]/80 border-[#2d2d44] text-white'}
              ${isPulsing ? 'scale-105' : 'scale-100'}
            `}>
              <div className="text-lg font-bold font-mono">
                {formatPrice(currentPrice.price)}
              </div>
              <div className={`text-xs font-medium ${
                (currentPrice.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(currentPrice.changePercent ?? 0) >= 0 ? '+' : ''}{(currentPrice.changePercent ?? 0).toFixed(2)}%
              </div>
            </div>
          </div>
        )}
      </div>

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

      {/* Stochastic Panel */}
      {hasStochastic && (
        <div className="border-t border-[#2d2d44] relative">
          <div className="absolute top-1 left-2 z-10 text-xs text-gray-500">
            Stochastic ({indicators.find((i) => i.id === 'stochastic')?.parameters.kPeriod || 14}, {indicators.find((i) => i.id === 'stochastic')?.parameters.kSmooth || 3}, {indicators.find((i) => i.id === 'stochastic')?.parameters.dSmooth || 3})
          </div>
          <div ref={stochasticContainerRef} className="w-full h-[100px]" />
        </div>
      )}

      {/* ATR Panel */}
      {hasATR && (
        <div className="border-t border-[#2d2d44] relative">
          <div className="absolute top-1 left-2 z-10 text-xs text-gray-500">
            ATR ({indicators.find((i) => i.id === 'atr')?.parameters.period || 14})
          </div>
          <div ref={atrContainerRef} className="w-full h-[100px]" />
        </div>
      )}

      {/* Loading State - Animated Candlesticks */}
      {!currentPrice && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f1a]">
          <div className="text-center">
            {/* Animated Candlestick Chart Loader */}
            <div className="flex items-end justify-center gap-2 h-16 mb-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-3 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-sm animate-pulse"
                  style={{
                    height: `${30 + (i % 3) * 15}px`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '1.2s',
                  }}
                >
                  <div className="w-0.5 h-2 bg-emerald-300 mx-auto -mt-2" />
                  <div className="w-0.5 h-2 bg-emerald-700 mx-auto mt-auto" />
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-sm">Loading {symbol} chart...</p>
            <p className="text-gray-500 text-xs mt-1">Fetching market data</p>
          </div>
        </div>
      )}
    </div>
  );
});

export const PriceChart = memo(PriceChartComponent);
