import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';

interface FinnhubTick {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
}

interface FinnhubCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

type PriceUpdateCallback = (tick: FinnhubTick) => void;

// US Stocks supported
const STOCK_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'INTC', 'NFLX',
  'CRM', 'ORCL', 'ADBE', 'CSCO', 'QCOM', 'JPM', 'BAC', 'WFC', 'GS', 'MS',
  'V', 'MA', 'PYPL', 'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY',
  'WMT', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX', 'HD', 'DIS',
  'XOM', 'CVX', 'BA', 'CAT', 'GE',
];

// Index ETFs (as proxy for indices)
const INDEX_SYMBOLS: Record<string, string> = {
  'US500': 'SPY',    // S&P 500 ETF
  'US100': 'QQQ',    // NASDAQ 100 ETF
  'US30': 'DIA',     // Dow Jones ETF
};

// Forex symbol mapping: Our symbols -> Finnhub/OANDA symbols
const FOREX_SYMBOL_MAP: Record<string, string> = {
  // Major pairs
  'EUR/USD': 'OANDA:EUR_USD',
  'GBP/USD': 'OANDA:GBP_USD',
  'USD/JPY': 'OANDA:USD_JPY',
  'AUD/USD': 'OANDA:AUD_USD',
  'USD/CAD': 'OANDA:USD_CAD',
  'NZD/USD': 'OANDA:NZD_USD',
  'USD/CHF': 'OANDA:USD_CHF',

  // EUR crosses
  'EUR/GBP': 'OANDA:EUR_GBP',
  'EUR/JPY': 'OANDA:EUR_JPY',
  'EUR/AUD': 'OANDA:EUR_AUD',
  'EUR/CAD': 'OANDA:EUR_CAD',
  'EUR/CHF': 'OANDA:EUR_CHF',
  'EUR/NZD': 'OANDA:EUR_NZD',

  // GBP crosses
  'GBP/JPY': 'OANDA:GBP_JPY',
  'GBP/AUD': 'OANDA:GBP_AUD',
  'GBP/CAD': 'OANDA:GBP_CAD',
  'GBP/CHF': 'OANDA:GBP_CHF',
  'GBP/NZD': 'OANDA:GBP_NZD',

  // JPY crosses
  'AUD/JPY': 'OANDA:AUD_JPY',
  'CAD/JPY': 'OANDA:CAD_JPY',
  'CHF/JPY': 'OANDA:CHF_JPY',
  'NZD/JPY': 'OANDA:NZD_JPY',

  // Other crosses
  'AUD/CAD': 'OANDA:AUD_CAD',
  'AUD/CHF': 'OANDA:AUD_CHF',
  'AUD/NZD': 'OANDA:AUD_NZD',
  'CAD/CHF': 'OANDA:CAD_CHF',
  'NZD/CAD': 'OANDA:NZD_CAD',
  'NZD/CHF': 'OANDA:NZD_CHF',
};

class FinnhubService {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private callbacks = new Set<PriceUpdateCallback>();
  private isAvailable = false;
  private latestPrices = new Map<string, FinnhubTick>();
  private apiKey: string;

  constructor() {
    this.apiKey = config.finnhub?.apiKey || '';

    if (this.apiKey) {
      this.connect();
    } else {
      logger.warn('[Finnhub] No API key configured - stock prices will be simulated');
    }
  }

  private connect(): void {
    if (!this.apiKey) {
      logger.warn('[Finnhub] Cannot connect without API key');
      return;
    }

    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[Finnhub] Max reconnection attempts reached');
      this.isAvailable = false;
      return;
    }

    this.isConnecting = true;
    const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;

    try {
      logger.info('[Finnhub] Connecting to WebSocket...');
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        logger.info('[Finnhub] WebSocket connected successfully');
        this.isConnecting = false;
        this.isAvailable = true;
        this.reconnectAttempts = 0;

        // Subscribe to all stock symbols
        this.subscribeToSymbols();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          logger.error('[Finnhub] Failed to parse message:', error);
        }
      });

      this.ws.on('error', (error) => {
        logger.error('[Finnhub] WebSocket error:', error);
        this.isConnecting = false;
        this.isAvailable = false;
      });

      this.ws.on('close', () => {
        logger.warn('[Finnhub] WebSocket disconnected');
        this.isConnecting = false;
        this.isAvailable = false;
        this.ws = null;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
          logger.info(`[Finnhub] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        }
      });
    } catch (error) {
      logger.error('[Finnhub] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.isAvailable = false;
    }
  }

  private subscribeToSymbols(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to stocks
    STOCK_SYMBOLS.forEach(symbol => {
      this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }));
    });

    // Subscribe to index ETFs
    Object.values(INDEX_SYMBOLS).forEach(symbol => {
      this.ws!.send(JSON.stringify({ type: 'subscribe', symbol }));
    });

    logger.info(`[Finnhub] Subscribed to ${STOCK_SYMBOLS.length + Object.keys(INDEX_SYMBOLS).length} symbols`);
  }

  private handleMessage(message: any): void {
    if (message.type !== 'trade' || !message.data) return;

    message.data.forEach((trade: any) => {
      const symbol = trade.s;

      // Check if it's an index ETF and map to our index symbol
      let ourSymbol = symbol;
      for (const [indexSymbol, etfSymbol] of Object.entries(INDEX_SYMBOLS)) {
        if (etfSymbol === symbol) {
          ourSymbol = indexSymbol;
          break;
        }
      }

      const tick: FinnhubTick = {
        symbol: ourSymbol,
        price: trade.p,
        timestamp: trade.t,
        volume: trade.v,
      };

      // Store latest price
      this.latestPrices.set(ourSymbol, tick);

      // Notify callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(tick);
        } catch (error) {
          logger.error('[Finnhub] Error in price callback:', error);
        }
      });
    });
  }

  public onPriceUpdate(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public getLatestPrice(symbol: string): FinnhubTick | null {
    return this.latestPrices.get(symbol) || null;
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getSupportedStockSymbols(): string[] {
    return STOCK_SYMBOLS;
  }

  public getSupportedIndexSymbols(): string[] {
    return Object.keys(INDEX_SYMBOLS);
  }

  public getStatus(): {
    available: boolean;
    connected: boolean;
    hasApiKey: boolean;
    stockCount: number;
    indexCount: number;
  } {
    return {
      available: this.isAvailable,
      connected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
      hasApiKey: !!this.apiKey,
      stockCount: STOCK_SYMBOLS.length,
      indexCount: Object.keys(INDEX_SYMBOLS).length,
    };
  }

  public cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Unsubscribe from all
      STOCK_SYMBOLS.forEach(symbol => {
        this.ws!.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      });
      Object.values(INDEX_SYMBOLS).forEach(symbol => {
        this.ws!.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      });

      this.ws.close();
      this.ws = null;
    }

    this.callbacks.clear();
    this.isAvailable = false;
  }

  /**
   * Get forex symbol in Finnhub/OANDA format
   */
  public getForexSymbol(ourSymbol: string): string | null {
    return FOREX_SYMBOL_MAP[ourSymbol] || null;
  }

  /**
   * Check if a symbol is a supported forex pair
   */
  public isForexSymbol(symbol: string): boolean {
    return symbol in FOREX_SYMBOL_MAP;
  }

  /**
   * Convert resolution in seconds to Finnhub resolution string
   */
  public static resolutionToInterval(resolutionSeconds: number): string {
    if (resolutionSeconds <= 60) return '1';
    if (resolutionSeconds <= 300) return '5';
    if (resolutionSeconds <= 900) return '15';
    if (resolutionSeconds <= 1800) return '30';
    if (resolutionSeconds <= 3600) return '60';
    if (resolutionSeconds <= 86400) return 'D';
    if (resolutionSeconds <= 604800) return 'W';
    return 'M';
  }

  /**
   * Fetch historical forex candles from Finnhub REST API
   * @param symbol Our symbol format (e.g., 'EUR/USD')
   * @param resolution Resolution string (1, 5, 15, 30, 60, D, W, M)
   * @param count Number of candles to fetch
   */
  public async getForexCandles(
    symbol: string,
    resolution: string = '60',
    count: number = 500
  ): Promise<FinnhubCandle[]> {
    if (!this.apiKey) {
      logger.warn('[Finnhub] No API key - cannot fetch forex candles');
      return [];
    }

    const finnhubSymbol = FOREX_SYMBOL_MAP[symbol];
    if (!finnhubSymbol) {
      logger.warn(`[Finnhub] Symbol ${symbol} not found in forex map`);
      return [];
    }

    // Calculate time range
    const now = Math.floor(Date.now() / 1000);
    const resolutionSeconds = this.getResolutionSeconds(resolution);
    // Add extra buffer for weekends and holidays
    const bufferMultiplier = resolution === 'D' ? 2 : resolution === 'W' ? 3 : 1.5;
    const from = now - Math.floor(count * resolutionSeconds * bufferMultiplier);

    const url = `https://finnhub.io/api/v1/forex/candle?symbol=${encodeURIComponent(finnhubSymbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${this.apiKey}`;

    try {
      logger.info(`[Finnhub] Fetching forex candles for ${symbol} (${finnhubSymbol}), resolution=${resolution}, count=${count}`);

      const response = await fetch(url);

      if (!response.ok) {
        logger.error(`[Finnhub] API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json() as {
        s: string;
        t?: number[];
        o?: number[];
        h?: number[];
        l?: number[];
        c?: number[];
        v?: number[];
      };

      if (data.s !== 'ok' || !data.t || !Array.isArray(data.t)) {
        logger.warn(`[Finnhub] No data for ${symbol}: status=${data.s}`);
        return [];
      }

      // Convert Finnhub response to our candle format
      const candles: FinnhubCandle[] = [];
      for (let i = 0; i < data.t.length; i++) {
        candles.push({
          time: data.t[i],
          open: data.o?.[i] ?? 0,
          high: data.h?.[i] ?? 0,
          low: data.l?.[i] ?? 0,
          close: data.c?.[i] ?? 0,
          volume: data.v?.[i],
        });
      }

      // Sort by time and limit to requested count
      candles.sort((a, b) => a.time - b.time);
      const result = candles.length > count ? candles.slice(-count) : candles;

      logger.info(`[Finnhub] Fetched ${result.length} forex candles for ${symbol}`);
      return result;
    } catch (error) {
      logger.error(`[Finnhub] Failed to fetch forex candles for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Convert resolution string to seconds
   */
  private getResolutionSeconds(resolution: string): number {
    switch (resolution) {
      case '1': return 60;
      case '5': return 300;
      case '15': return 900;
      case '30': return 1800;
      case '60': return 3600;
      case 'D': return 86400;
      case 'W': return 604800;
      case 'M': return 2592000;
      default: return 3600;
    }
  }
}

export const finnhubService = new FinnhubService();
export { FinnhubService, FinnhubCandle };
