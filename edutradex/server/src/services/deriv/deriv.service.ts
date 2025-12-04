import WebSocket from 'ws';
import { config } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

interface DerivTick {
  symbol: string;
  quote: number;
  ask: number;
  bid: number;
  epoch: number;
}

interface SymbolSubscription {
  symbol: string;
  derivSymbol: string;
  subscriptionId?: string;
}

interface DerivSymbol {
  allow_forward_starting: number;
  display_name: string;
  display_order: number;
  exchange_is_open: number;
  is_trading_suspended: number;
  market: string;
  market_display_name: string;
  pip: number;
  submarket: string;
  submarket_display_name: string;
  symbol: string;
  symbol_type: string;
}

type PriceUpdateCallback = (tick: DerivTick) => void;

class DerivService {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private subscriptions = new Map<string, SymbolSubscription>();
  private callbacks = new Set<PriceUpdateCallback>();
  private pingInterval: NodeJS.Timeout | null = null;
  private isAvailable = false;
  private activeSymbols: DerivSymbol[] = [];
  private symbolsFetched = false;

  // Symbol mapping: Our symbols -> Deriv symbols
  private symbolMap = new Map<string, string>([
    // Major Forex pairs
    ['EUR/USD', 'frxEURUSD'],
    ['GBP/USD', 'frxGBPUSD'],
    ['USD/JPY', 'frxUSDJPY'],
    ['AUD/USD', 'frxAUDUSD'],
    ['USD/CAD', 'frxUSDCAD'],
    ['NZD/USD', 'frxNZDUSD'],
    ['USD/CHF', 'frxUSDCHF'],

    // EUR crosses
    ['EUR/GBP', 'frxEURGBP'],
    ['EUR/JPY', 'frxEURJPY'],
    ['EUR/AUD', 'frxEURAUD'],
    ['EUR/CAD', 'frxEURCAD'],
    ['EUR/CHF', 'frxEURCHF'],
    ['EUR/NZD', 'frxEURNZD'],

    // GBP crosses
    ['GBP/JPY', 'frxGBPJPY'],
    ['GBP/AUD', 'frxGBPAUD'],
    ['GBP/CAD', 'frxGBPCAD'],
    ['GBP/CHF', 'frxGBPCHF'],
    ['GBP/NZD', 'frxGBPNZD'],

    // JPY crosses
    ['AUD/JPY', 'frxAUDJPY'],
    ['CAD/JPY', 'frxCADJPY'],
    ['CHF/JPY', 'frxCHFJPY'],
    ['NZD/JPY', 'frxNZDJPY'],

    // Other crosses
    ['AUD/CAD', 'frxAUDCAD'],
    ['AUD/CHF', 'frxAUDCHF'],
    ['AUD/NZD', 'frxAUDNZD'],
    ['CAD/CHF', 'frxCADCHF'],
    ['NZD/CAD', 'frxNZDCAD'],
    ['NZD/CHF', 'frxNZDCHF'],

    // OTC pairs (use same as forex)
    ['OTC_EUR/USD', 'frxEURUSD'],
    ['OTC_GBP/USD', 'frxGBPUSD'],
    ['OTC_USD/JPY', 'frxUSDJPY'],
    ['OTC_AUD/USD', 'frxAUDUSD'],
    ['OTC_GBP/JPY', 'frxGBPJPY'],
    ['OTC_EUR/JPY', 'frxEURJPY'],

    // More OTC pairs
    ['OTC_USD/CHF', 'frxUSDCHF'],
    ['OTC_EUR/GBP', 'frxEURGBP'],

    // Volatility indices
    ['VOL_10', 'R_10'],
    ['VOL_25', 'R_25'],
    ['VOL_50', 'R_50'],
    ['VOL_75', 'R_75'],
    ['VOL_100', 'R_100'],
    ['VOL_150', 'R_150'],
    ['VOL_200', 'R_200'],
    ['VOL_250', 'R_250'],

    // 1-second Volatility indices
    ['VOL_10_1S', '1HZ10V'],
    ['VOL_25_1S', '1HZ25V'],
    ['VOL_50_1S', '1HZ50V'],
    ['VOL_75_1S', '1HZ75V'],
    ['VOL_100_1S', '1HZ100V'],
    ['VOL_150_1S', '1HZ150V'],
    ['VOL_200_1S', '1HZ200V'],
    ['VOL_250_1S', '1HZ250V'],

    // Crash indices
    ['CRASH_300', 'CRASH300'],
    ['CRASH_500', 'CRASH500'],
    ['CRASH_600', 'CRASH600'],
    ['CRASH_900', 'CRASH900'],
    ['CRASH_1000', 'CRASH1000'],

    // Boom indices
    ['BOOM_300', 'BOOM300'],
    ['BOOM_500', 'BOOM500'],
    ['BOOM_600', 'BOOM600'],
    ['BOOM_900', 'BOOM900'],
    ['BOOM_1000', 'BOOM1000'],

    // Step indices
    ['STEP_INDEX', 'stpRNG'],

    // Jump indices
    ['JUMP_10', 'JD10'],
    ['JUMP_25', 'JD25'],
    ['JUMP_50', 'JD50'],
    ['JUMP_75', 'JD75'],
    ['JUMP_100', 'JD100'],

    // Range Break indices
    ['RANGE_100', 'RDBULL'],
    ['RANGE_200', 'RDBEAR'],
  ]);

  constructor() {
    if (config.deriv.useDerivApi) {
      this.connect();
    } else {
      logger.info('[Deriv] Deriv API disabled in config');
    }
  }

  private connect = (): void => {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[Deriv] Max reconnection attempts reached, marking as unavailable');
      this.isAvailable = false;
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${config.deriv.wsUrl}${config.deriv.appId}`;

    try {
      logger.info(`[Deriv] Connecting to ${wsUrl}...`);
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        logger.info('[Deriv] WebSocket connected successfully');
        this.isConnecting = false;
        this.isAvailable = true;
        this.reconnectAttempts = 0;

        // Start ping to keep connection alive
        this.startPing();

        // Fetch active symbols
        this.fetchActiveSymbols();

        // Resubscribe to all symbols
        this.resubscribeAll();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          const dataStr = data.toString();
          logger.error('[Deriv] Failed to parse message:', {
            preview: dataStr.substring(0, 100),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      this.ws.on('error', (error) => {
        logger.error('[Deriv] WebSocket error:', error);
        this.isConnecting = false;
        this.isAvailable = false;
      });

      this.ws.on('close', () => {
        logger.warn('[Deriv] WebSocket disconnected');
        this.isConnecting = false;
        this.isAvailable = false;
        this.ws = null;

        // Clear ping interval
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * this.reconnectAttempts;
          logger.info(`[Deriv] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, delay);
        } else {
          logger.error('[Deriv] Max reconnection attempts reached');
        }
      });
    } catch (error) {
      logger.error('[Deriv] Failed to create WebSocket:', error);
      this.isConnecting = false;
      this.isAvailable = false;
    }
  };

  private startPing = (): void => {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }));
      }
    }, 30000);
  };

  private handleMessage = (message: any): void => {
    // Handle ping response
    if (message.msg_type === 'ping') {
      return;
    }

    // Handle active symbols response
    if (message.msg_type === 'active_symbols' && message.active_symbols) {
      this.activeSymbols = message.active_symbols;
      this.symbolsFetched = true;
      logger.info(`[Deriv] Fetched ${this.activeSymbols.length} active symbols`);
      return;
    }

    // Handle tick updates
    if (message.msg_type === 'tick' && message.tick) {
      const tick: DerivTick = {
        symbol: this.getOurSymbol(message.tick.symbol) || message.tick.symbol,
        quote: message.tick.quote,
        ask: message.tick.ask,
        bid: message.tick.bid,
        epoch: message.tick.epoch,
      };

      // Notify all callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(tick);
        } catch (error) {
          logger.error('[Deriv] Error in price update callback:', error);
        }
      });

      // Handle subscription confirmation
      if (message.subscription) {
        const ourSymbol = this.getOurSymbol(message.tick.symbol);
        if (ourSymbol) {
          const subscription = this.subscriptions.get(ourSymbol);
          if (subscription) {
            subscription.subscriptionId = message.subscription.id;
            logger.info(`[Deriv] Subscribed to ${ourSymbol} (${subscription.derivSymbol})`);
          }
        }
      }
    }

    // Handle errors
    if (message.error) {
      logger.error('[Deriv] API error:', message.error);
    }
  };

  private getOurSymbol(derivSymbol: string): string | undefined {
    for (const [ourSymbol, dSymbol] of this.symbolMap.entries()) {
      if (dSymbol === derivSymbol) {
        return ourSymbol;
      }
    }
    return undefined;
  }

  private resubscribeAll = (): void => {
    this.subscriptions.forEach((subscription) => {
      this.subscribeToSymbol(subscription.symbol);
    });
  };

  public subscribe(symbol: string): void {
    if (!this.symbolMap.has(symbol)) {
      logger.warn(`[Deriv] Symbol ${symbol} not supported`);
      return;
    }

    const derivSymbol = this.symbolMap.get(symbol)!;

    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, {
        symbol,
        derivSymbol,
      });
    }

    // Subscribe if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToSymbol(symbol);
    }
  }

  private subscribeToSymbol(symbol: string): void {
    const subscription = this.subscriptions.get(symbol);
    if (!subscription || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const request = {
      ticks: subscription.derivSymbol,
      subscribe: 1,
    };

    this.ws.send(JSON.stringify(request));
    logger.info(`[Deriv] Subscribing to ${symbol} (${subscription.derivSymbol})`);
  }

  public unsubscribe(symbol: string): void {
    const subscription = this.subscriptions.get(symbol);
    if (!subscription) {
      return;
    }

    // Unsubscribe from Deriv if we have a subscription ID
    if (subscription.subscriptionId && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        forget: subscription.subscriptionId,
      }));
      logger.info(`[Deriv] Unsubscribed from ${symbol}`);
    }

    this.subscriptions.delete(symbol);
  }

  public onPriceUpdate(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getStatus(): {
    available: boolean;
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: number;
  } {
    return {
      available: this.isAvailable,
      connected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
    };
  }

  private fetchActiveSymbols = (): void => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({
      active_symbols: 'brief',
      product_type: 'basic',
    }));

    logger.info('[Deriv] Requesting active symbols');
  };

  public getActiveSymbols(): DerivSymbol[] {
    return this.activeSymbols;
  }

  public getForexSymbols(): DerivSymbol[] {
    return this.activeSymbols.filter(s => s.market === 'forex');
  }

  public getSyntheticSymbols(): DerivSymbol[] {
    return this.activeSymbols.filter(s => s.market === 'synthetic_index');
  }

  public getCommoditySymbols(): DerivSymbol[] {
    return this.activeSymbols.filter(s => s.market === 'commodities');
  }

  public getIndicesSymbols(): DerivSymbol[] {
    return this.activeSymbols.filter(s => s.market === 'indices');
  }

  public isSymbolsFetched(): boolean {
    return this.symbolsFetched;
  }

  public cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
    this.callbacks.clear();
    this.isAvailable = false;
  }
}

// Export singleton instance
export const derivService = new DerivService();
