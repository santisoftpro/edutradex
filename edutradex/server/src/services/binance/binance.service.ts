import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';

interface BinanceTick {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
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
}

export const binanceService = new BinanceService();
