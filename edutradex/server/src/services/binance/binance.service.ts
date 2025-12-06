import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';

interface BinanceTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
}

interface BinanceKline {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type PriceUpdateCallback = (tick: BinanceTick) => void;

// Map our symbols to Binance symbols
const SYMBOL_MAP: Record<string, string> = {
  'BTC/USD': 'btcusdt',
  'ETH/USD': 'ethusdt',
  'BNB/USD': 'bnbusdt',
  'SOL/USD': 'solusdt',
  'XRP/USD': 'xrpusdt',
  'ADA/USD': 'adausdt',
  'DOGE/USD': 'dogeusdt',
  'DOT/USD': 'dotusdt',
  'LTC/USD': 'ltcusdt',
  'BCH/USD': 'bchusdt',
  'AVAX/USD': 'avaxusdt',
  'MATIC/USD': 'maticusdt',
  'ATOM/USD': 'atomusdt',
  'NEAR/USD': 'nearusdt',
  'FTM/USD': 'ftmusdt',
  'ALGO/USD': 'algousdt',
  'ICP/USD': 'icpusdt',
  'APT/USD': 'aptusdt',
  'SUI/USD': 'suiusdt',
  'LINK/USD': 'linkusdt',
  'UNI/USD': 'uniusdt',
  'AAVE/USD': 'aaveusdt',
  'MKR/USD': 'mkrusdt',
  'CRV/USD': 'crvusdt',
  'SHIB/USD': 'shibusdt',
  'PEPE/USD': 'pepeusdt',
  'BONK/USD': 'bonkusdt',
  'XLM/USD': 'xlmusdt',
  'ETC/USD': 'etcusdt',
  'XMR/USD': 'xmrusdt',
  'TRX/USD': 'trxusdt',
  'VET/USD': 'vetusdt',
  'FIL/USD': 'filusdt',
  'HBAR/USD': 'hbarusdt',
  'ARB/USD': 'arbusdt',
  'OP/USD': 'opusdt',
};

// Reverse map for looking up our symbol from Binance symbol
const REVERSE_SYMBOL_MAP: Record<string, string> = {};
Object.entries(SYMBOL_MAP).forEach(([ourSymbol, binanceSymbol]) => {
  REVERSE_SYMBOL_MAP[binanceSymbol] = ourSymbol;
});

class BinanceService {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000;
  private callbacks = new Set<PriceUpdateCallback>();
  private isAvailable = false;
  private latestPrices = new Map<string, BinanceTick>();

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[Binance] Max reconnection attempts reached');
      this.isAvailable = false;
      return;
    }

    this.isConnecting = true;

    // Build stream names for all symbols
    const streams = Object.values(SYMBOL_MAP).map(s => `${s}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      logger.info('[Binance] Connecting to WebSocket...');
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        logger.info('[Binance] WebSocket connected successfully');
        this.isConnecting = false;
        this.isAvailable = true;
        this.reconnectAttempts = 0;
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          logger.error('[Binance] Failed to parse message:', error);
        }
      });

      this.ws.on('error', (error) => {
        logger.error('[Binance] WebSocket error:', error);
        this.isConnecting = false;
        this.isAvailable = false;
      });

      this.ws.on('close', () => {
        logger.warn('[Binance] WebSocket disconnected');
        this.isConnecting = false;
        this.isAvailable = false;
        this.ws = null;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.min(this.reconnectAttempts, 5);
          logger.info(`[Binance] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        }
      });
    } catch (error) {
      logger.error('[Binance] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.isAvailable = false;
    }
  }

  private handleMessage(message: any): void {
    if (!message.data || !message.stream) return;

    const tickerData = message.data;
    const binanceSymbol = message.stream.replace('@ticker', '');
    const ourSymbol = REVERSE_SYMBOL_MAP[binanceSymbol];

    if (!ourSymbol) return;

    const tick: BinanceTick = {
      symbol: ourSymbol,
      price: parseFloat(tickerData.c), // Current price
      bid: parseFloat(tickerData.b),   // Best bid
      ask: parseFloat(tickerData.a),   // Best ask
      timestamp: tickerData.E,         // Event time
    };

    // Store latest price
    this.latestPrices.set(ourSymbol, tick);

    // Notify callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(tick);
      } catch (error) {
        logger.error('[Binance] Error in price callback:', error);
      }
    });
  }

  public onPriceUpdate(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public getLatestPrice(symbol: string): BinanceTick | null {
    return this.latestPrices.get(symbol) || null;
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getSupportedSymbols(): string[] {
    return Object.keys(SYMBOL_MAP);
  }

  public getStatus(): {
    available: boolean;
    connected: boolean;
    symbolCount: number;
  } {
    return {
      available: this.isAvailable,
      connected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
      symbolCount: Object.keys(SYMBOL_MAP).length,
    };
  }

  public cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.clear();
    this.isAvailable = false;
  }

  /**
   * Fetch historical klines (candlesticks) from Binance REST API
   * @param symbol Our symbol format (e.g., 'BTC/USD')
   * @param interval Binance interval (1m, 5m, 15m, 1h, 4h, 1d, etc.)
   * @param limit Number of candles to fetch (max 1000)
   */
  public async getHistoricalKlines(
    symbol: string,
    interval: string = '1m',
    limit: number = 500
  ): Promise<BinanceKline[]> {
    const binanceSymbol = SYMBOL_MAP[symbol];
    if (!binanceSymbol) {
      logger.warn(`[Binance] Symbol ${symbol} not found in symbol map`);
      return [];
    }

    try {
      const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any[][];

      // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
      const klines: BinanceKline[] = data.map((kline) => ({
        time: Math.floor(kline[0] / 1000), // Convert ms to seconds
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      logger.debug(`[Binance] Fetched ${klines.length} klines for ${symbol} (${interval})`);
      return klines;
    } catch (error) {
      logger.error(`[Binance] Failed to fetch klines for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Convert resolution in seconds to Binance interval string
   */
  public static resolutionToInterval(resolutionSeconds: number): string {
    if (resolutionSeconds < 60) return '1m'; // Binance minimum is 1m
    if (resolutionSeconds < 180) return '1m';
    if (resolutionSeconds < 300) return '3m';
    if (resolutionSeconds < 900) return '5m';
    if (resolutionSeconds < 1800) return '15m';
    if (resolutionSeconds < 3600) return '30m';
    if (resolutionSeconds < 7200) return '1h';
    if (resolutionSeconds < 14400) return '2h';
    if (resolutionSeconds < 28800) return '4h';
    if (resolutionSeconds < 43200) return '6h';
    if (resolutionSeconds < 86400) return '12h';
    return '1d';
  }

  public getBinanceSymbol(symbol: string): string | null {
    return SYMBOL_MAP[symbol] || null;
  }
}

export const binanceService = new BinanceService();
export { BinanceService };
export type { BinanceKline };
