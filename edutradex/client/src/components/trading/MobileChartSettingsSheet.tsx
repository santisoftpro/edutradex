'use client';

import { memo, useState, useCallback } from 'react';
import {
  X,
  Check,
  Clock,
  CandlestickChart,
  LineChart,
  AreaChart,
  BarChart,
  TrendingUp,
  Minus,
  GitBranch,
  Trash2,
  PenTool,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ChartType = 'candlestick' | 'line' | 'area' | 'bars' | 'heikin-ashi';
type DrawingTool = 'none' | 'trendline' | 'horizontal' | 'fibonacci' | 'rectangle' | 'ray';

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
  secondaryColor?: string;
  parameters: Record<string, number>;
}

interface MobileChartSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Timeframe
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  // Chart type
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  // Indicators
  indicators: IndicatorConfig[];
  onToggleIndicator: (id: string) => void;
  onUpdateIndicatorParams: (id: string, params: Record<string, number>) => void;
  // Volume
  showVolume: boolean;
  onToggleVolume: () => void;
  // Drawing tools
  drawingTool: DrawingTool;
  onDrawingToolChange: (tool: DrawingTool) => void;
  drawnLinesCount: number;
  onClearDrawings: () => void;
}

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
  ],
  days: [
    { label: '1D', seconds: 86400 },
  ],
};

const CHART_TYPES: { id: ChartType; name: string; icon: React.ReactNode }[] = [
  { id: 'candlestick', name: 'Candlestick', icon: <CandlestickChart className="w-5 h-5" /> },
  { id: 'line', name: 'Line', icon: <LineChart className="w-5 h-5" /> },
  { id: 'area', name: 'Area', icon: <AreaChart className="w-5 h-5" /> },
  { id: 'bars', name: 'OHLC Bars', icon: <BarChart className="w-5 h-5" /> },
  { id: 'heikin-ashi', name: 'Heikin Ashi', icon: <CandlestickChart className="w-5 h-5" /> },
];

const DRAWING_TOOLS: { id: DrawingTool; name: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'trendline', name: 'Trend Line', icon: <TrendingUp className="w-5 h-5" />, hint: 'Click 2 points' },
  { id: 'horizontal', name: 'Horizontal', icon: <Minus className="w-5 h-5" />, hint: 'Click to place' },
  { id: 'fibonacci', name: 'Fibonacci', icon: <GitBranch className="w-5 h-5" />, hint: 'Click 2 points' },
  { id: 'ray', name: 'Ray', icon: <TrendingUp className="w-5 h-5 rotate-45" />, hint: 'Extended line' },
  { id: 'rectangle', name: 'Rectangle', icon: <BarChart3 className="w-5 h-5" />, hint: 'Click 2 corners' },
];

type SettingsTab = 'main' | 'timeframe' | 'chartType' | 'indicators' | 'drawing';

function MobileChartSettingsSheetComponent({
  isOpen,
  onClose,
  selectedTimeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  indicators,
  onToggleIndicator,
  onUpdateIndicatorParams,
  showVolume,
  onToggleVolume,
  drawingTool,
  onDrawingToolChange,
  drawnLinesCount,
  onClearDrawings,
}: MobileChartSettingsSheetProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('main');
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);

  const activeIndicatorCount = indicators.filter(i => i.enabled).length;

  const handleClose = useCallback(() => {
    setActiveTab('main');
    onClose();
  }, [onClose]);

  const handleTimeframeSelect = useCallback((tf: TimeframeOption) => {
    onTimeframeChange(tf);
    handleClose();
  }, [onTimeframeChange, handleClose]);

  const handleChartTypeSelect = useCallback((type: ChartType) => {
    onChartTypeChange(type);
    handleClose();
  }, [onChartTypeChange, handleClose]);

  const handleDrawingToolSelect = useCallback((tool: DrawingTool) => {
    onDrawingToolChange(tool === drawingTool ? 'none' : tool);
    handleClose();
  }, [onDrawingToolChange, drawingTool, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 md:hidden"
        onClick={handleClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#1a1a2e] rounded-t-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center py-1.5">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-3 pb-2 border-b border-[#2d2d44]">
          <h2 className="text-white font-semibold text-sm">
            {activeTab === 'main' && 'Chart Settings'}
            {activeTab === 'timeframe' && 'Timeframe'}
            {activeTab === 'chartType' && 'Chart Type'}
            {activeTab === 'indicators' && 'Indicators'}
            {activeTab === 'drawing' && 'Drawing Tools'}
          </h2>
          <button
            onClick={activeTab === 'main' ? handleClose : () => setActiveTab('main')}
            className="p-1.5 hover:bg-[#252542] rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {activeTab === 'main' && (
            <div className="space-y-1.5">
              {/* Timeframe Option */}
              <button
                onClick={() => setActiveTab('timeframe')}
                className="w-full flex items-center justify-between p-2.5 bg-[#252542] rounded-lg active:bg-[#2d2d52] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">Timeframe</p>
                    <p className="text-gray-400 text-[10px]">Candle interval</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold text-sm">{selectedTimeframe.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </button>

              {/* Chart Type Option */}
              <button
                onClick={() => setActiveTab('chartType')}
                className="w-full flex items-center justify-between p-2.5 bg-[#252542] rounded-lg active:bg-[#2d2d52] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <CandlestickChart className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">Chart Type</p>
                    <p className="text-gray-400 text-[10px]">Display style</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-400 font-medium text-sm capitalize">{chartType.replace('-', ' ')}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </button>

              {/* Indicators Option */}
              <button
                onClick={() => setActiveTab('indicators')}
                className="w-full flex items-center justify-between p-2.5 bg-[#252542] rounded-lg active:bg-[#2d2d52] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">Indicators</p>
                    <p className="text-gray-400 text-[10px]">Technical analysis</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {activeIndicatorCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-full font-medium">
                      {activeIndicatorCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </button>

              {/* Drawing Tools Option */}
              <button
                onClick={() => setActiveTab('drawing')}
                className="w-full flex items-center justify-between p-2.5 bg-[#252542] rounded-lg active:bg-[#2d2d52] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <PenTool className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">Drawing Tools</p>
                    <p className="text-gray-400 text-[10px]">Lines & shapes</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {drawnLinesCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-medium">
                      {drawnLinesCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </button>

              {/* Volume Toggle */}
              <button
                onClick={onToggleVolume}
                className="w-full flex items-center justify-between p-2.5 bg-[#252542] rounded-lg active:bg-[#2d2d52] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    showVolume ? 'bg-cyan-500/20' : 'bg-gray-500/20'
                  )}>
                    <BarChart className={cn('w-4 h-4', showVolume ? 'text-cyan-400' : 'text-gray-400')} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">Volume</p>
                    <p className="text-gray-400 text-[10px]">Show volume bars</p>
                  </div>
                </div>
                <div className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  showVolume ? 'bg-cyan-500' : 'bg-gray-600'
                )}>
                  <div className={cn(
                    'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                    showVolume ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </div>
              </button>
            </div>
          )}

          {activeTab === 'timeframe' && (
            <div className="space-y-3">
              {/* Seconds */}
              <div>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1.5">Seconds</p>
                <div className="flex flex-wrap gap-1.5">
                  {TIMEFRAME_GROUPS.seconds.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1.5">Minutes</p>
                <div className="flex flex-wrap gap-1.5">
                  {TIMEFRAME_GROUPS.minutes.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours */}
              <div>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1.5">Hours</p>
                <div className="flex flex-wrap gap-1.5">
                  {TIMEFRAME_GROUPS.hours.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div>
                <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider mb-1.5">Days</p>
                <div className="flex flex-wrap gap-1.5">
                  {TIMEFRAME_GROUPS.days.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#252542] text-gray-400 active:bg-[#2d2d52]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chartType' && (
            <div className="space-y-1.5">
              {CHART_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleChartTypeSelect(type.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all',
                    chartType === type.id
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-[#252542] text-gray-300 active:bg-[#2d2d52]'
                  )}
                >
                  {type.icon}
                  <span className="font-medium text-sm">{type.name}</span>
                  {chartType === type.id && <Check className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="space-y-1.5">
              {indicators.map((indicator) => (
                <div key={indicator.id} className="rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      'flex items-center justify-between p-2.5 transition-all',
                      indicator.enabled
                        ? 'bg-blue-500/20'
                        : 'bg-[#252542]'
                    )}
                  >
                    <button
                      onClick={() => onToggleIndicator(indicator.id)}
                      className="flex items-center gap-2 flex-1"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: indicator.color }}
                      />
                      <span className={cn(
                        'font-medium text-sm',
                        indicator.enabled ? 'text-blue-400' : 'text-gray-300'
                      )}>
                        {indicator.name}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase">
                        {indicator.type}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      {Object.keys(indicator.parameters).length > 0 && (
                        <button
                          onClick={() => setExpandedIndicator(expandedIndicator === indicator.id ? null : indicator.id)}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            expandedIndicator === indicator.id ? 'bg-blue-500/30 text-blue-400' : 'bg-[#1a1a2e] text-gray-500'
                          )}
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onToggleIndicator(indicator.id)}
                        className={cn(
                          'w-10 h-6 rounded-full transition-colors relative flex-shrink-0',
                          indicator.enabled ? 'bg-blue-500' : 'bg-gray-600'
                        )}
                      >
                        <div className={cn(
                          'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                          indicator.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        )} />
                      </button>
                    </div>
                  </div>
                  {expandedIndicator === indicator.id && Object.keys(indicator.parameters).length > 0 && (
                    <div className="px-3 py-2 bg-[#151528] space-y-2 border-t border-[#2d2d44]">
                      {Object.entries(indicator.parameters).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between gap-2">
                          <label className="text-xs text-gray-400 capitalize">{key}</label>
                          <input
                            type="number"
                            value={value}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value) || 0;
                              if (newValue > 0) {
                                onUpdateIndicatorParams(indicator.id, { [key]: newValue });
                              }
                            }}
                            className="w-20 px-2 py-1.5 text-sm bg-[#1a1a2e] border border-[#3d3d5c] rounded-lg text-gray-300 text-center focus:outline-none focus:border-blue-500"
                            min="1"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'drawing' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                {DRAWING_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleDrawingToolSelect(tool.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all',
                      drawingTool === tool.id
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-[#252542] text-gray-300 active:bg-[#2d2d52]'
                    )}
                  >
                    {tool.icon}
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{tool.name}</p>
                      <p className="text-[10px] text-gray-500">{tool.hint}</p>
                    </div>
                    {drawingTool === tool.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              {drawnLinesCount > 0 && (
                <button
                  onClick={() => {
                    onClearDrawings();
                    handleClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-red-500/20 text-red-400 rounded-lg active:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-medium text-sm">Clear All Drawings ({drawnLinesCount})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const MobileChartSettingsSheet = memo(MobileChartSettingsSheetComponent);
