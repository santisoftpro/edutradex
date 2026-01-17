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
  BarChart3,
  Settings,
  Activity,
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
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (tf: TimeframeOption) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  indicators: IndicatorConfig[];
  onToggleIndicator: (id: string) => void;
  onUpdateIndicatorParams: (id: string, params: Record<string, number>) => void;
  showVolume: boolean;
  onToggleVolume: () => void;
  drawingTool: DrawingTool;
  onDrawingToolChange: (tool: DrawingTool) => void;
  drawnLinesCount: number;
  onClearDrawings: () => void;
}

// Quick timeframes shown at top
const QUICK_TIMEFRAMES: TimeframeOption[] = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1h', seconds: 3600 },
  { label: '4h', seconds: 14400 },
  { label: '1D', seconds: 86400 },
];

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
  { id: 'candlestick', name: 'Candlestick', icon: <CandlestickChart className="w-4 h-4" /> },
  { id: 'line', name: 'Line', icon: <LineChart className="w-4 h-4" /> },
  { id: 'area', name: 'Area', icon: <AreaChart className="w-4 h-4" /> },
  { id: 'bars', name: 'OHLC Bars', icon: <BarChart className="w-4 h-4" /> },
  { id: 'heikin-ashi', name: 'Heikin Ashi', icon: <CandlestickChart className="w-4 h-4" /> },
];

const DRAWING_TOOLS: { id: DrawingTool; name: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'trendline', name: 'Trend Line', icon: <TrendingUp className="w-4 h-4" />, hint: 'Click 2 points' },
  { id: 'horizontal', name: 'Horizontal', icon: <Minus className="w-4 h-4" />, hint: 'Click to place' },
  { id: 'fibonacci', name: 'Fibonacci', icon: <GitBranch className="w-4 h-4" />, hint: 'Click 2 points' },
  { id: 'ray', name: 'Ray', icon: <TrendingUp className="w-4 h-4 rotate-45" />, hint: 'Extended line' },
  { id: 'rectangle', name: 'Rectangle', icon: <BarChart3 className="w-4 h-4" />, hint: 'Click 2 corners' },
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
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-[#12121f] rounded-t-2xl max-h-[75vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-8 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-white font-semibold text-base">
            {activeTab === 'main' && 'Chart Settings'}
            {activeTab === 'timeframe' && 'Timeframe'}
            {activeTab === 'chartType' && 'Chart Type'}
            {activeTab === 'indicators' && 'Indicators'}
            {activeTab === 'drawing' && 'Drawing Tools'}
          </h2>
          <button
            onClick={activeTab === 'main' ? handleClose : () => setActiveTab('main')}
            className="p-1.5 hover:bg-[#1e1e32] rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {activeTab === 'main' && (
            <div className="space-y-4">
              {/* Quick Timeframe Buttons */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Quick Timeframe</p>
                <div className="flex gap-1.5">
                  {QUICK_TIMEFRAMES.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-semibold transition-all',
                        selectedTimeframe.seconds === tf.seconds
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1e1e32] text-gray-400 active:bg-[#252540]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display Section */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Display</p>
                <div className="bg-[#1a1a2e] rounded-xl overflow-hidden divide-y divide-[#252540]">
                  {/* Timeframe Option */}
                  <button
                    onClick={() => setActiveTab('timeframe')}
                    className="w-full flex items-center justify-between p-3 active:bg-[#252540] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium text-sm">Timeframe</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400 font-semibold text-sm">{selectedTimeframe.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </button>

                  {/* Chart Type Option */}
                  <button
                    onClick={() => setActiveTab('chartType')}
                    className="w-full flex items-center justify-between p-3 active:bg-[#252540] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/15 rounded-lg flex items-center justify-center">
                        <CandlestickChart className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium text-sm">Chart Type</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-blue-400 font-medium text-sm capitalize">{chartType.replace('-', ' ')}</span>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </button>

                  {/* Volume Toggle */}
                  <button
                    onClick={onToggleVolume}
                    className="w-full flex items-center justify-between p-3 active:bg-[#252540] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        showVolume ? 'bg-blue-500/15' : 'bg-gray-500/15'
                      )}>
                        <Activity className={cn('w-4 h-4', showVolume ? 'text-blue-400' : 'text-gray-500')} />
                      </div>
                      <span className="text-white font-medium text-sm">Volume</span>
                    </div>
                    <div className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      showVolume ? 'bg-blue-500' : 'bg-gray-700'
                    )}>
                      <div className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                        showVolume ? 'translate-x-6' : 'translate-x-1'
                      )} />
                    </div>
                  </button>
                </div>
              </div>

              {/* Tools Section */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Tools</p>
                <div className="bg-[#1a1a2e] rounded-xl overflow-hidden divide-y divide-[#252540]">
                  {/* Indicators Option */}
                  <button
                    onClick={() => setActiveTab('indicators')}
                    className="w-full flex items-center justify-between p-3 active:bg-[#252540] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/15 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-white font-medium text-sm">Indicators</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {activeIndicatorCount > 0 && (
                        <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] rounded-full font-semibold">
                          {activeIndicatorCount}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </button>

                  {/* Drawing Tools Option */}
                  <button
                    onClick={() => setActiveTab('drawing')}
                    className="w-full flex items-center justify-between p-3 active:bg-[#252540] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/15 rounded-lg flex items-center justify-center">
                        <PenTool className="w-4 h-4 text-orange-400" />
                      </div>
                      <span className="text-white font-medium text-sm">Drawing Tools</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {drawnLinesCount > 0 && (
                        <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-semibold">
                          {drawnLinesCount}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeframe' && (
            <div className="space-y-4">
              {/* Seconds */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Seconds</p>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_GROUPS.seconds.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a2e] text-gray-400 active:bg-[#252540]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Minutes</p>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_GROUPS.minutes.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a2e] text-gray-400 active:bg-[#252540]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Hours</p>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_GROUPS.hours.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a2e] text-gray-400 active:bg-[#252540]'
                      )}
                    >
                      {tf.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div>
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Days</p>
                <div className="flex flex-wrap gap-2">
                  {TIMEFRAME_GROUPS.days.map((tf) => (
                    <button
                      key={tf.label}
                      onClick={() => handleTimeframeSelect(tf)}
                      className={cn(
                        'px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                        selectedTimeframe.label === tf.label
                          ? 'bg-blue-500 text-white'
                          : 'bg-[#1a1a2e] text-gray-400 active:bg-[#252540]'
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
            <div className="bg-[#1a1a2e] rounded-xl overflow-hidden divide-y divide-[#252540]">
              {CHART_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleChartTypeSelect(type.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 transition-all',
                    chartType === type.id
                      ? 'bg-blue-500/10'
                      : 'active:bg-[#252540]'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    chartType === type.id ? 'bg-blue-500/20' : 'bg-[#252540]'
                  )}>
                    <span className={chartType === type.id ? 'text-blue-400' : 'text-gray-400'}>
                      {type.icon}
                    </span>
                  </div>
                  <span className={cn(
                    'font-medium text-sm flex-1 text-left',
                    chartType === type.id ? 'text-blue-400' : 'text-white'
                  )}>
                    {type.name}
                  </span>
                  {chartType === type.id && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="bg-[#1a1a2e] rounded-xl overflow-hidden divide-y divide-[#252540]">
              {indicators.map((indicator) => (
                <div key={indicator.id}>
                  <div className={cn(
                    'flex items-center justify-between p-3 transition-all',
                    indicator.enabled ? 'bg-blue-500/5' : ''
                  )}>
                    <button
                      onClick={() => onToggleIndicator(indicator.id)}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: indicator.color }}
                      />
                      <div className="text-left">
                        <span className={cn(
                          'font-medium text-sm',
                          indicator.enabled ? 'text-blue-400' : 'text-white'
                        )}>
                          {indicator.name}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase ml-2">
                          {indicator.type}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {Object.keys(indicator.parameters).length > 0 && (
                        <button
                          onClick={() => setExpandedIndicator(expandedIndicator === indicator.id ? null : indicator.id)}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            expandedIndicator === indicator.id ? 'bg-blue-500/20 text-blue-400' : 'bg-[#252540] text-gray-500'
                          )}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div
                        onClick={() => onToggleIndicator(indicator.id)}
                        className={cn(
                          'w-11 h-6 rounded-full transition-colors relative cursor-pointer',
                          indicator.enabled ? 'bg-blue-500' : 'bg-gray-700'
                        )}
                      >
                        <div className={cn(
                          'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                          indicator.enabled ? 'translate-x-6' : 'translate-x-1'
                        )} />
                      </div>
                    </div>
                  </div>
                  {expandedIndicator === indicator.id && Object.keys(indicator.parameters).length > 0 && (
                    <div className="px-4 py-3 bg-[#151525] space-y-2 border-t border-[#252540]">
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
                            className="w-20 px-2 py-1.5 text-sm bg-[#1a1a2e] border border-[#3d3d5c] rounded-lg text-white text-center focus:outline-none focus:border-blue-500"
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
              <div className="bg-[#1a1a2e] rounded-xl overflow-hidden divide-y divide-[#252540]">
                {DRAWING_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleDrawingToolSelect(tool.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 transition-all',
                      drawingTool === tool.id
                        ? 'bg-orange-500/10'
                        : 'active:bg-[#252540]'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      drawingTool === tool.id ? 'bg-orange-500/20' : 'bg-[#252540]'
                    )}>
                      <span className={drawingTool === tool.id ? 'text-orange-400' : 'text-gray-400'}>
                        {tool.icon}
                      </span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className={cn(
                        'font-medium text-sm',
                        drawingTool === tool.id ? 'text-orange-400' : 'text-white'
                      )}>
                        {tool.name}
                      </p>
                      <p className="text-[10px] text-gray-500">{tool.hint}</p>
                    </div>
                    {drawingTool === tool.id && <Check className="w-4 h-4 text-orange-400" />}
                  </button>
                ))}
              </div>

              {drawnLinesCount > 0 && (
                <button
                  onClick={() => {
                    onClearDrawings();
                    handleClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 text-red-400 rounded-xl active:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="font-semibold text-sm">Clear All ({drawnLinesCount})</span>
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
