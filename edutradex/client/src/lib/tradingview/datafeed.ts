import { api } from '../api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000/ws';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface SymbolInfo {
  name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  ticker: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_seconds: boolean;
  seconds_multipliers?: string[];
  intraday_multipliers?: string[];
  supported_resolutions: string[];
  volume_precision: number;
  data_status: string;
}

interface LibrarySymbolInfo extends SymbolInfo {
  full_name: string;
  listed_exchange: string;
  exchange: string;
  format: string;
}

interface SubscriberUID {
  [subscriberUID: string]: {
    symbolInfo: LibrarySymbolInfo;
    resolution: string;
    lastBar: Bar | null;
    callback: (bar: Bar) => void;
  };
}

class TradingViewDatafeed {
  private ws: WebSocket | null = null;
  private subscribers: SubscriberUID = {};
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  constructor() {
    this.connectWebSocket();
  }

  private connectWebSocket(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[Datafeed] WebSocket connected');
        this.isConnecting = false;

        // Resubscribe to all active symbols
        Object.values(this.subscribers).forEach(sub => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'subscribe',
              payload: { symbol: sub.symbolInfo.name }
            }));
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'price_update') {
            this.handlePriceUpdate(message.payload);
          }
        } catch (error) {
          console.error('[Datafeed] Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Datafeed] WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onclose = () => {
        console.log('[Datafeed] WebSocket disconnected');
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect after 3 seconds
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(() => {
          this.connectWebSocket();
        }, 3000);
      };
    } catch (error) {
      console.error('[Datafeed] Failed to create WebSocket:', error);
      this.isConnecting = false;
    }
  }

  private handlePriceUpdate(tick: any): void {
    const symbol = tick.symbol;

    // Update all subscribers for this symbol
    Object.entries(this.subscribers).forEach(([uid, sub]) => {
      if (sub.symbolInfo.name === symbol) {
        const bar: Bar = {
          time: new Date(tick.timestamp).getTime(),
          open: tick.price,
          high: tick.price,
          low: tick.price,
          close: tick.price,
          volume: 0
        };

        // Update or create the current bar
        if (sub.lastBar) {
          const resolution = this.parseResolution(sub.resolution);
          const barTime = Math.floor(bar.time / resolution) * resolution;
          const lastBarTime = Math.floor(sub.lastBar.time / resolution) * resolution;

          if (barTime === lastBarTime) {
            // Update existing bar
            sub.lastBar.high = Math.max(sub.lastBar.high, bar.close);
            sub.lastBar.low = Math.min(sub.lastBar.low, bar.close);
            sub.lastBar.close = bar.close;
            sub.lastBar.volume = (sub.lastBar.volume || 0) + 1;

            sub.callback({ ...sub.lastBar });
          } else {
            // New bar
            const newBar: Bar = {
              time: barTime,
              open: bar.close,
              high: bar.close,
              low: bar.close,
              close: bar.close,
              volume: 1
            };
            sub.lastBar = newBar;
            sub.callback(newBar);
          }
        } else {
          sub.lastBar = bar;
          sub.callback(bar);
        }
      }
    });
  }

  private parseResolution(resolution: string): number {
    // Convert TradingView resolution to milliseconds
    if (resolution.endsWith('S')) {
      return parseInt(resolution) * 1000; // seconds
    } else if (resolution === 'D') {
      return 24 * 60 * 60 * 1000; // day
    } else if (resolution === 'W') {
      return 7 * 24 * 60 * 60 * 1000; // week
    } else {
      return parseInt(resolution) * 60 * 1000; // minutes
    }
  }

  onReady(callback: (config: any) => void): void {
    setTimeout(() => {
      callback({
        supported_resolutions: ['1S', '5S', '15S', '30S', '1', '5', '15', '30', '60', '240', 'D'],
        supports_marks: false,
        supports_timescale_marks: false,
        supports_time: true,
        supports_search: true,
        supports_group_request: false,
      });
    }, 0);
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (symbols: any[]) => void
  ): void {
    const symbols = [
      { symbol: 'EUR/USD', full_name: 'EUR/USD', description: 'Euro / US Dollar', exchange: 'FOREX', type: 'forex' },
      { symbol: 'GBP/USD', full_name: 'GBP/USD', description: 'British Pound / US Dollar', exchange: 'FOREX', type: 'forex' },
      { symbol: 'USD/JPY', full_name: 'USD/JPY', description: 'US Dollar / Japanese Yen', exchange: 'FOREX', type: 'forex' },
      { symbol: 'AUD/USD', full_name: 'AUD/USD', description: 'Australian Dollar / US Dollar', exchange: 'FOREX', type: 'forex' },
      { symbol: 'USD/CAD', full_name: 'USD/CAD', description: 'US Dollar / Canadian Dollar', exchange: 'FOREX', type: 'forex' },
      { symbol: 'EUR/GBP', full_name: 'EUR/GBP', description: 'Euro / British Pound', exchange: 'FOREX', type: 'forex' },
      { symbol: 'NZD/USD', full_name: 'NZD/USD', description: 'New Zealand Dollar / US Dollar', exchange: 'FOREX', type: 'forex' },
      { symbol: 'USD/CHF', full_name: 'USD/CHF', description: 'US Dollar / Swiss Franc', exchange: 'FOREX', type: 'forex' },
      { symbol: 'OTC_EUR/USD', full_name: 'OTC_EUR/USD', description: 'OTC Euro / US Dollar', exchange: 'OTC', type: 'otc' },
      { symbol: 'OTC_GBP/USD', full_name: 'OTC_GBP/USD', description: 'OTC British Pound / US Dollar', exchange: 'OTC', type: 'otc' },
      { symbol: 'VOL_10', full_name: 'VOL_10', description: 'Volatility 10 Index', exchange: 'SYNTHETIC', type: 'index' },
      { symbol: 'VOL_25', full_name: 'VOL_25', description: 'Volatility 25 Index', exchange: 'SYNTHETIC', type: 'index' },
      { symbol: 'VOL_50', full_name: 'VOL_50', description: 'Volatility 50 Index', exchange: 'SYNTHETIC', type: 'index' },
      { symbol: 'VOL_100', full_name: 'VOL_100', description: 'Volatility 100 Index', exchange: 'SYNTHETIC', type: 'index' },
    ];

    const filtered = symbols.filter(s =>
      s.symbol.toLowerCase().includes(userInput.toLowerCase()) ||
      s.description.toLowerCase().includes(userInput.toLowerCase())
    );

    onResult(filtered);
  }

  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (error: string) => void
  ): void {
    setTimeout(() => {
      try {
        const pricescale = symbolName.includes('JPY') ? 1000 : 100000;
        const symbolInfo: LibrarySymbolInfo = {
          name: symbolName,
          full_name: symbolName,
          description: symbolName.replace(/_/g, ' / '),
          type: 'forex',
          session: '24x7',
          timezone: 'Etc/UTC',
          ticker: symbolName,
          exchange: 'FOREX',
          listed_exchange: 'FOREX',
          minmov: 1,
          pricescale: pricescale,
          has_intraday: true,
          has_seconds: true,
          seconds_multipliers: ['1', '5', '15', '30'],
          intraday_multipliers: ['1', '5', '15', '30', '60', '240'],
          supported_resolutions: ['1S', '5S', '15S', '30S', '1', '5', '15', '30', '60', '240', 'D'],
          volume_precision: 0,
          data_status: 'streaming',
          format: 'price',
        };

        onResolve(symbolInfo);
      } catch (error: any) {
        onError(error.message || 'Failed to resolve symbol');
      }
    }, 0);
  }

  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: {
      from: number;
      to: number;
      firstDataRequest: boolean;
      countBack?: number;
    },
    onResult: (bars: Bar[], meta: { noData: boolean }) => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      // Convert resolution to seconds
      let resolutionSeconds = 60; // default 1 minute
      if (resolution.endsWith('S')) {
        resolutionSeconds = parseInt(resolution);
      } else if (resolution === 'D') {
        resolutionSeconds = 86400;
      } else {
        resolutionSeconds = parseInt(resolution) * 60;
      }

      // Fetch historical bars from our API
      const response = await api.get<{
        success: boolean;
        data: Bar[];
      }>(`/market/bars/${encodeURIComponent(symbolInfo.name)}`, {
        params: {
          resolution: resolutionSeconds,
          limit: periodParams.countBack || 300
        }
      });

      if (response.success && response.data.length > 0) {
        const bars = response.data.filter(bar =>
          bar.time >= periodParams.from && bar.time <= periodParams.to
        );

        onResult(bars, { noData: bars.length === 0 });
      } else {
        onResult([], { noData: true });
      }
    } catch (error: any) {
      console.error('[Datafeed] Error fetching bars:', error);
      onError(error.message || 'Failed to fetch historical data');
    }
  }

  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeededCallback?: () => void
  ): void {
    this.subscribers[subscriberUID] = {
      symbolInfo,
      resolution,
      lastBar: null,
      callback: onTick,
    };

    // Subscribe to WebSocket updates for this symbol
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        payload: { symbol: symbolInfo.name }
      }));
    }

    console.log(`[Datafeed] Subscribed to ${symbolInfo.name} with UID ${subscriberUID}`);
  }

  unsubscribeBars(subscriberUID: string): void {
    const subscriber = this.subscribers[subscriberUID];

    if (subscriber) {
      // Unsubscribe from WebSocket if no other subscribers for this symbol
      const symbolName = subscriber.symbolInfo.name;
      const hasOtherSubscribers = Object.entries(this.subscribers).some(
        ([uid, sub]) => uid !== subscriberUID && sub.symbolInfo.name === symbolName
      );

      if (!hasOtherSubscribers && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'unsubscribe',
          payload: { symbol: symbolName }
        }));
      }

      delete this.subscribers[subscriberUID];
      console.log(`[Datafeed] Unsubscribed from UID ${subscriberUID}`);
    }
  }

  cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscribers = {};
  }
}

// Export a singleton instance
export const datafeed = new TradingViewDatafeed();
