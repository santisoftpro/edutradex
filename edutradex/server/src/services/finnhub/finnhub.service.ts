import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/env.js';

interface FinnhubTick {
  symbol: string;
  price: number;
  timestamp: number;
  volume: number;
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
}

export const finnhubService = new FinnhubService();
