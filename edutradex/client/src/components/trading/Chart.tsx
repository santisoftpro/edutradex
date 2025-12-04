'use client';

import { useEffect, useRef, memo, useState } from 'react';

interface ChartProps {
  symbol: string;
}

// Map internal symbols to TradingView symbols
const SYMBOL_MAP: Record<string, string> = {
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',
  'USD/JPY': 'FX:USDJPY',
  'AUD/USD': 'FX:AUDUSD',
  'USD/CAD': 'FX:USDCAD',
  'USD/CHF': 'FX:USDCHF',
  'NZD/USD': 'FX:NZDUSD',
  'EUR/GBP': 'FX:EURGBP',
  'EUR/JPY': 'FX:EURJPY',
  'EUR/AUD': 'FX:EURAUD',
  'EUR/CAD': 'FX:EURCAD',
  'EUR/CHF': 'FX:EURCHF',
  'EUR/NZD': 'FX:EURNZD',
  'GBP/JPY': 'FX:GBPJPY',
  'GBP/AUD': 'FX:GBPAUD',
  'GBP/CAD': 'FX:GBPCAD',
  'GBP/CHF': 'FX:GBPCHF',
  'GBP/NZD': 'FX:GBPNZD',
  'AUD/JPY': 'FX:AUDJPY',
  'AUD/CAD': 'FX:AUDCAD',
  'AUD/CHF': 'FX:AUDCHF',
  'AUD/NZD': 'FX:AUDNZD',
  'CAD/JPY': 'FX:CADJPY',
  'CAD/CHF': 'FX:CADCHF',
  'CHF/JPY': 'FX:CHFJPY',
  'NZD/JPY': 'FX:NZDJPY',
  'NZD/CAD': 'FX:NZDCAD',
  'NZD/CHF': 'FX:NZDCHF',
  'BTC/USD': 'COINBASE:BTCUSD',
  'ETH/USD': 'COINBASE:ETHUSD',
  'XAU/USD': 'TVC:GOLD',
  'XAG/USD': 'TVC:SILVER',
};

function ChartComponent({ symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget safely
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    scriptRef.current = null;

    // Get TradingView symbol - for OTC/synthetic, don't show TradingView chart
    const tvSymbol = SYMBOL_MAP[symbol];

    if (!tvSymbol) {
      // For OTC/synthetic symbols, show a placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'flex items-center justify-center h-full w-full text-gray-500';
      placeholder.innerHTML = `
        <div class="text-center">
          <p class="text-lg font-medium">${symbol}</p>
          <p class="text-sm">OTC/Synthetic chart not available</p>
        </div>
      `;
      container.appendChild(placeholder);
      return;
    }

    // Create unique container ID to avoid conflicts
    const containerId = `tradingview_${symbol.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.id = containerId;
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    widgetContainer.appendChild(widgetDiv);

    container.appendChild(widgetContainer);

    // Create and load TradingView script with delay to ensure container is ready
    const loadWidget = () => {
      if (!container.contains(widgetContainer)) return;

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: tvSymbol,
        interval: '1',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        backgroundColor: 'rgba(15, 15, 26, 1)',
        gridColor: 'rgba(30, 30, 46, 1)',
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        calendar: false,
        hide_volume: true,
        support_host: 'https://www.tradingview.com',
        container_id: containerId,
      });

      widgetContainer.appendChild(script);
      scriptRef.current = script;
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(loadWidget, 100);

    return () => {
      clearTimeout(timeoutId);
      // Safe cleanup - remove children without innerHTML to avoid iframe issues
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      scriptRef.current = null;
    };
  }, [symbol, widgetKey]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0f0f1a] relative">
      <div ref={containerRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
    </div>
  );
}

export const Chart = memo(ChartComponent);
