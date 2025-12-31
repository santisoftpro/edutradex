import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ChartType = 'candlestick' | 'line' | 'area' | 'bars' | 'heikin-ashi';
type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci';

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

interface DrawnLine {
  id: string;
  type: 'trendline' | 'horizontal' | 'fibonacci';
  points: { time: number; value: number }[];
}

export interface FavoritePair {
  symbol: string;
  payout: number;
}

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { id: 'sma20', name: 'SMA (20)', type: 'overlay', enabled: false, color: '#f59e0b' },
  { id: 'ema9', name: 'EMA (9)', type: 'overlay', enabled: false, color: '#8b5cf6' },
  { id: 'ema21', name: 'EMA (21)', type: 'overlay', enabled: false, color: '#06b6d4' },
  { id: 'bollinger', name: 'Bollinger Bands', type: 'overlay', enabled: false, color: '#6366f1' },
  { id: 'rsi', name: 'RSI (14)', type: 'panel', enabled: false, color: '#f59e0b' },
  { id: 'macd', name: 'MACD', type: 'panel', enabled: false, color: '#22c55e' },
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

  // Volume
  showVolume: boolean;
  toggleVolume: () => void;

  // Drawing tools
  drawingTool: DrawingTool;
  setDrawingTool: (tool: DrawingTool) => void;
  drawnLines: DrawnLine[];
  addDrawnLine: (line: DrawnLine) => void;
  undoDrawing: () => DrawnLine | undefined;
  clearDrawings: () => void;

  // Favorite pairs
  favoritePairs: FavoritePair[];
  addFavoritePair: (pair: FavoritePair) => void;
  removeFavoritePair: (symbol: string) => void;

  // UI state
  showMobileControls: boolean;
  setShowMobileControls: (show: boolean) => void;
}

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      // Timeframe
      selectedTimeframe: DEFAULT_TIMEFRAME,
      setTimeframe: (tf) => set({ selectedTimeframe: tf }),

      // Chart type
      chartType: 'candlestick',
      setChartType: (type) => set({ chartType: type }),

      // Indicators
      indicators: DEFAULT_INDICATORS,
      toggleIndicator: (id) =>
        set((state) => ({
          indicators: state.indicators.map((ind) =>
            ind.id === id ? { ...ind, enabled: !ind.enabled } : ind
          ),
        })),

      // Volume
      showVolume: false,
      toggleVolume: () => set((state) => ({ showVolume: !state.showVolume })),

      // Drawing tools
      drawingTool: 'none',
      setDrawingTool: (tool) => set({ drawingTool: tool }),
      drawnLines: [],
      addDrawnLine: (line) =>
        set((state) => ({ drawnLines: [...state.drawnLines, line] })),
      undoDrawing: () => {
        let removedLine: DrawnLine | undefined;
        set((state) => {
          if (state.drawnLines.length === 0) return state;
          removedLine = state.drawnLines[state.drawnLines.length - 1];
          return { drawnLines: state.drawnLines.slice(0, -1) };
        });
        return removedLine;
      },
      clearDrawings: () => set({ drawnLines: [], drawingTool: 'none' }),

      // Favorite pairs
      favoritePairs: [],
      addFavoritePair: (pair) =>
        set((state) => {
          if (state.favoritePairs.some((p) => p.symbol === pair.symbol)) {
            return state;
          }
          return { favoritePairs: [...state.favoritePairs, pair] };
        }),
      removeFavoritePair: (symbol) =>
        set((state) => ({
          favoritePairs: state.favoritePairs.filter((p) => p.symbol !== symbol),
        })),

      // UI state
      showMobileControls: true,
      setShowMobileControls: (show) => set({ showMobileControls: show }),
    }),
    {
      name: 'chart-settings',
      partialize: (state) => ({
        selectedTimeframe: state.selectedTimeframe,
        chartType: state.chartType,
        indicators: state.indicators,
        showVolume: state.showVolume,
        favoritePairs: state.favoritePairs,
      }),
    }
  )
);
