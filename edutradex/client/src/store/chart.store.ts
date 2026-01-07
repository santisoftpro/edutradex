import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChartType = 'candlestick' | 'line' | 'area' | 'bars' | 'heikin-ashi';
export type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci' | 'rectangle' | 'ray';
export type DrawingType = 'trendline' | 'horizontal' | 'fibonacci' | 'rectangle' | 'ray';

interface TimeframeOption {
  label: string;
  seconds: number;
}

export interface IndicatorConfig {
  id: string;
  name: string;
  type: 'overlay' | 'panel';
  enabled: boolean;
  color?: string;
  secondaryColor?: string;
  parameters: Record<string, number>;
}

export interface DrawnLine {
  id: string;
  type: DrawingType;
  symbol: string;
  points: { time: number; value: number }[];
  color?: string;
  createdAt: number;
}

export interface FavoritePair {
  symbol: string;
  payout: number;
}

// Chart Templates/Presets
export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  indicatorIds: string[];
  chartType: 'candlestick' | 'line' | 'area' | 'bars' | 'heikin-ashi';
  showVolume: boolean;
}

export const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'clean',
    name: 'Clean',
    description: 'No indicators, clean price action',
    indicatorIds: [],
    chartType: 'candlestick',
    showVolume: false,
  },
  {
    id: 'trader',
    name: 'Trader',
    description: 'EMA crossover with RSI',
    indicatorIds: ['ema', 'ema21', 'rsi'],
    chartType: 'candlestick',
    showVolume: true,
  },
  {
    id: 'scalper',
    name: 'Scalper',
    description: 'Bollinger Bands with Stochastic',
    indicatorIds: ['bollinger', 'stochastic'],
    chartType: 'candlestick',
    showVolume: true,
  },
  {
    id: 'swing',
    name: 'Swing',
    description: 'MACD with SMA for trend following',
    indicatorIds: ['sma', 'macd'],
    chartType: 'candlestick',
    showVolume: true,
  },
  {
    id: 'ichimoku',
    name: 'Ichimoku',
    description: 'Full Ichimoku Cloud setup',
    indicatorIds: ['ichimoku'],
    chartType: 'candlestick',
    showVolume: false,
  },
];

// Price Alerts
export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  createdAt: number;
  triggered: boolean;
}

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  // Overlay indicators
  { id: 'sma', name: 'SMA', type: 'overlay', enabled: false, color: '#f59e0b', parameters: { period: 20 } },
  { id: 'ema', name: 'EMA', type: 'overlay', enabled: false, color: '#8b5cf6', parameters: { period: 9 } },
  { id: 'ema21', name: 'EMA', type: 'overlay', enabled: false, color: '#06b6d4', parameters: { period: 21 } },
  { id: 'bollinger', name: 'Bollinger', type: 'overlay', enabled: false, color: '#6366f1', parameters: { period: 20, stdDev: 2 } },
  { id: 'vwap', name: 'VWAP', type: 'overlay', enabled: false, color: '#38bdf8', parameters: {} },
  { id: 'ichimoku', name: 'Ichimoku', type: 'overlay', enabled: false, color: '#818cf8', parameters: { tenkan: 9, kijun: 26, senkou: 52 } },
  // Panel indicators (oscillators)
  { id: 'rsi', name: 'RSI', type: 'panel', enabled: false, color: '#f59e0b', parameters: { period: 14 } },
  { id: 'macd', name: 'MACD', type: 'panel', enabled: false, color: '#22c55e', secondaryColor: '#ef4444', parameters: { fast: 12, slow: 26, signal: 9 } },
  { id: 'stochastic', name: 'Stochastic', type: 'panel', enabled: false, color: '#a78bfa', secondaryColor: '#f472b6', parameters: { kPeriod: 14, kSmooth: 3, dSmooth: 3 } },
  { id: 'atr', name: 'ATR', type: 'panel', enabled: false, color: '#f472b6', parameters: { period: 14 } },
];

const DEFAULT_TIMEFRAME: TimeframeOption = { label: '1m', seconds: 60 };

interface ChartState {
  // Timeframe
  selectedTimeframe: TimeframeOption;
  setTimeframe: (tf: TimeframeOption) => void;

  // Chart type
  chartType: ChartType;
  setChartType: (type: ChartType) => void;

  // Indicators
  indicators: IndicatorConfig[];
  toggleIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: Record<string, number>) => void;

  // Volume
  showVolume: boolean;
  toggleVolume: () => void;

  // Drawing tools
  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  drawnLines: DrawnLine[];
  addDrawnLine: (line: DrawnLine) => void;
  undoDrawing: (symbol: string) => DrawnLine | undefined;
  clearDrawings: (symbol?: string) => void;
  getDrawingsForSymbol: (symbol: string) => DrawnLine[];

  // Favorite pairs
  favoritePairs: FavoritePair[];
  addFavoritePair: (pair: FavoritePair) => void;
  removeFavoritePair: (symbol: string) => void;

  // UI state
  showMobileControls: boolean;
  setShowMobileControls: (show: boolean) => void;

  // Chart Templates
  activeTemplateId: string | null;
  applyTemplate: (templateId: string) => void;

  // Price Alerts
  priceAlerts: PriceAlert[];
  addPriceAlert: (symbol: string, price: number) => void;
  removePriceAlert: (id: string) => void;
  clearPriceAlerts: (symbol?: string) => void;
  getAlertsForSymbol: (symbol: string) => PriceAlert[];
  markAlertTriggered: (id: string) => void;
}

export const useChartStore = create<ChartState>()(
  persist(
    (set, get) => ({
      // Timeframe
      selectedTimeframe: DEFAULT_TIMEFRAME,
      setTimeframe: (tf) => set({ selectedTimeframe: tf }),

      // Chart type
      chartType: 'candlestick',
      setChartType: (type) => set({ chartType: type }),

      // Indicators
      indicators: DEFAULT_INDICATORS as IndicatorConfig[],
      toggleIndicator: (id) =>
        set((state) => ({
          indicators: state.indicators.map((ind) =>
            ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
          ),
        })),
      updateIndicatorParams: (id, params) =>
        set((state) => ({
          indicators: state.indicators.map((ind) =>
            ind.id === id ? { ...ind, parameters: { ...ind.parameters, ...params } } : ind
          ),
        })),

      // Volume
      showVolume: false,
      toggleVolume: () => set((state) => ({ showVolume: !state.showVolume })),

      // Drawing tools
      drawingTool: 'none' as DrawingTool,
      setDrawingTool: (tool) => set({ drawingTool: tool }),
      drawnLines: [] as DrawnLine[],
      addDrawnLine: (line) =>
        set((state) => {
          // Limit to 50 drawings per symbol
          const symbolDrawings = state.drawnLines.filter((d) => d.symbol === line.symbol);
          if (symbolDrawings.length >= 50) {
            // Remove oldest drawing for this symbol
            const oldestId = symbolDrawings.sort((a, b) => a.createdAt - b.createdAt)[0].id;
            return {
              drawnLines: [...state.drawnLines.filter((d) => d.id !== oldestId), line],
            };
          }
          return { drawnLines: [...state.drawnLines, line] };
        }),
      undoDrawing: (symbol: string) => {
        let removedLine: DrawnLine | undefined;
        set((state) => {
          const symbolDrawings = state.drawnLines.filter((d) => d.symbol === symbol);
          if (symbolDrawings.length === 0) return state;
          // Remove most recent drawing for this symbol
          const sortedDrawings = [...symbolDrawings].sort((a, b) => b.createdAt - a.createdAt);
          removedLine = sortedDrawings[0];
          return { drawnLines: state.drawnLines.filter((d) => d.id !== removedLine!.id) };
        });
        return removedLine;
      },
      clearDrawings: (symbol?: string) =>
        set((state) => ({
          drawnLines: symbol
            ? state.drawnLines.filter((d) => d.symbol !== symbol)
            : [],
          drawingTool: 'none',
        })),
      getDrawingsForSymbol: (symbol: string): DrawnLine[] => {
        return get().drawnLines.filter((d: DrawnLine) => d.symbol === symbol);
      },

      // Favorite pairs
      favoritePairs: [] as FavoritePair[],
      addFavoritePair: (pair: FavoritePair) =>
        set((state) => {
          if (state.favoritePairs.some((p) => p.symbol === pair.symbol)) {
            return state;
          }
          return { favoritePairs: [...state.favoritePairs, pair] };
        }),
      removeFavoritePair: (symbol: string) =>
        set((state) => ({
          favoritePairs: state.favoritePairs.filter((p) => p.symbol !== symbol),
        })),

      // UI state
      showMobileControls: true,
      setShowMobileControls: (show: boolean) => set({ showMobileControls: show }),

      // Chart Templates
      activeTemplateId: null,
      applyTemplate: (templateId: string) => {
        const template = CHART_TEMPLATES.find((t) => t.id === templateId);
        if (!template) return;

        set((state) => ({
          activeTemplateId: templateId,
          chartType: template.chartType,
          showVolume: template.showVolume,
          indicators: state.indicators.map((ind) => ({
            ...ind,
            enabled: template.indicatorIds.includes(ind.id),
          })),
        }));
      },

      // Price Alerts
      priceAlerts: [] as PriceAlert[],
      addPriceAlert: (symbol: string, price: number) =>
        set((state) => {
          // Limit to 10 alerts per symbol
          const symbolAlerts = state.priceAlerts.filter((a) => a.symbol === symbol);
          if (symbolAlerts.length >= 10) {
            // Remove oldest alert for this symbol
            const oldestId = symbolAlerts.sort((a, b) => a.createdAt - b.createdAt)[0].id;
            return {
              priceAlerts: [
                ...state.priceAlerts.filter((a) => a.id !== oldestId),
                {
                  id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  symbol,
                  price,
                  createdAt: Date.now(),
                  triggered: false,
                },
              ],
            };
          }
          return {
            priceAlerts: [
              ...state.priceAlerts,
              {
                id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                symbol,
                price,
                createdAt: Date.now(),
                triggered: false,
              },
            ],
          };
        }),
      removePriceAlert: (id: string) =>
        set((state) => ({
          priceAlerts: state.priceAlerts.filter((a) => a.id !== id),
        })),
      clearPriceAlerts: (symbol?: string) =>
        set((state) => ({
          priceAlerts: symbol
            ? state.priceAlerts.filter((a) => a.symbol !== symbol)
            : [],
        })),
      getAlertsForSymbol: (symbol: string): PriceAlert[] => {
        return get().priceAlerts.filter((a: PriceAlert) => a.symbol === symbol);
      },
      markAlertTriggered: (id: string) =>
        set((state) => ({
          priceAlerts: state.priceAlerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a
          ),
        })),
    }),
    {
      name: 'chart-settings-v3',
      partialize: (state) => ({
        selectedTimeframe: state.selectedTimeframe,
        chartType: state.chartType,
        indicators: state.indicators,
        showVolume: state.showVolume,
        favoritePairs: state.favoritePairs,
        drawnLines: state.drawnLines,
        activeTemplateId: state.activeTemplateId,
        priceAlerts: state.priceAlerts,
      }),
    }
  )
);
