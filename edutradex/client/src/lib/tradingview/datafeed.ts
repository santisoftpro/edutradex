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
        // Convert timestamp to seconds (to match historical bar format)
        const tickTimeSeconds = Math.floor(new Date(tick.timestamp).getTime() / 1000);
        const price = tick.price;

        // Get resolution in seconds
        const resolutionSeconds = this.parseResolution(sub.resolution);

        // Align tick time to bar boundary
        const barTime = Math.floor(tickTimeSeconds / resolutionSeconds) * resolutionSeconds;

        // Update or create the current bar
        if (sub.lastBar) {
          const lastBarTime = sub.lastBar.time;

          if (barTime === lastBarTime) {
            // Update existing bar - only update high/low/close
            sub.lastBar.high = Math.max(sub.lastBar.high, price);
            sub.lastBar.low = Math.min(sub.lastBar.low, price);
            sub.lastBar.close = price;
            sub.lastBar.volume = (sub.lastBar.volume || 0) + 1;

            sub.callback({ ...sub.lastBar });
          } else if (barTime > lastBarTime) {
            // New bar - use previous close as open for continuity
            // Check for unrealistic gaps based on asset type
            const gapPercent = Math.abs(price - sub.lastBar.close) / sub.lastBar.close * 100;
            const isCrypto = symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL');
            const isOTC = symbol.startsWith('OTC_');
            // OTC and crypto allow larger gaps (1%), forex strict (0.1%)
            const maxGapPercent = (isCrypto || isOTC) ? 1.0 : 0.1;

            let openPrice = sub.lastBar.close;

            // If gap is too large, use current price as open (prevents giant candles)
            if (gapPercent > maxGapPercent) {
              console.warn(`[Datafeed] Large gap detected for ${symbol}: ${gapPercent.toFixed(2)}%, using current price as open`);
              openPrice = price;
            }

            const newBar: Bar = {
              time: barTime,
              open: openPrice,
              high: Math.max(openPrice, price),
              low: Math.min(openPrice, price),
              close: price,
              volume: 1
            };
            sub.lastBar = newBar;
            sub.callback(newBar);
          }
          // Ignore ticks older than lastBar (barTime < lastBarTime)
        } else {
          // First tick - create initial bar
          const newBar: Bar = {
            time: barTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 1
          };
          sub.lastBar = newBar;
          sub.callback(newBar);
        }
      }
    });
  }

  private parseResolution(resolution: string): number {
    // Convert TradingView resolution to SECONDS (to match historical bar format)
    if (resolution.endsWith('S')) {
      return parseInt(resolution); // already seconds
    } else if (resolution === 'D') {
      return 24 * 60 * 60; // day in seconds
    } else if (resolution === 'W') {
      return 7 * 24 * 60 * 60; // week in seconds
    } else {
      return parseInt(resolution) * 60; // minutes to seconds
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
        let bars = response.data.filter(bar =>
          bar.time >= periodParams.from && bar.time <= periodParams.to
        );

        // Ensure bars are sorted by time ascending
        bars = bars.sort((a, b) => a.time - b.time);

        // IMPORTANT: Store the last bar for real-time continuity
        // This ensures live ticks continue from the correct price level
        if (bars.length > 0) {
          const lastBar = bars[bars.length - 1];

          // Calculate current bar time boundary
          const now = Math.floor(Date.now() / 1000);
          const currentBarTime = Math.floor(now / resolutionSeconds) * resolutionSeconds;

          // If the last historical bar is the current bar, use it directly
          // Otherwise, we need to handle the transition
          Object.values(this.subscribers).forEach(sub => {
            if (sub.symbolInfo.name === symbolInfo.name && sub.resolution === resolution) {
              // Clone the last bar to avoid mutation issues
              sub.lastBar = {
                time: lastBar.time,
                open: lastBar.open,
                high: lastBar.high,
                low: lastBar.low,
                close: lastBar.close,
                volume: lastBar.volume || 0
              };

              console.log(`[Datafeed] Set lastBar for ${symbolInfo.name}: time=${lastBar.time}, close=${lastBar.close}`);
            }
          });
        }

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
