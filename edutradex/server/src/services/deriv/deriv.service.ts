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

interface DerivCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
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
  private requestCounter = 1;

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

  /**
   * Fetch historical candles from Deriv API via WebSocket
   * @param symbol Our symbol format (e.g., 'EUR/USD')
   * @param granularity Candle size in seconds (60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400)
   * @param count Number of candles to fetch (max 5000)
   */
  public async getHistoricalCandles(
    symbol: string,
    granularity: number = 60,
    count: number = 500
  ): Promise<DerivCandle[]> {
    const isConnected = await this.waitForConnection();
    if (!isConnected) {
      logger.warn(`[Deriv] WebSocket not connected after wait - cannot fetch candles for ${symbol}`);
      return [];
    }

    const derivSymbol = this.symbolMap.get(symbol);
    if (!derivSymbol) {
      logger.warn(`[Deriv] Symbol ${symbol} not found in symbol map`);
      return [];
    }

    // Validate granularity - Deriv only supports specific values
    const validGranularities = [60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400];
    const closestGranularity = validGranularities.reduce((prev, curr) =>
      Math.abs(curr - granularity) < Math.abs(prev - granularity) ? curr : prev
    );

    // Use WebSocket to fetch historical candles (Deriv doesn't have REST API)
    return this.fetchCandlesViaWebSocket(derivSymbol, closestGranularity, count, symbol);
  }

  /**
   * Fetch historical candles via WebSocket request
   * Uses 'count' parameter instead of 'start'/'end' for more reliable results
   */
  private fetchCandlesViaWebSocket(
    derivSymbol: string,
    granularity: number,
    count: number,
    ourSymbol: string
  ): Promise<DerivCandle[]> {
    return new Promise((resolve) => {
      // If not connected, return empty
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        logger.warn(`[Deriv] WebSocket not connected, cannot fetch candles for ${ourSymbol}`);
        resolve([]);
        return;
      }

      // Deriv API requires req_id to be an integer, not a string!
      this.requestCounter = (this.requestCounter % 10000) + 1;
      const requestId = this.requestCounter;
      let resolved = false;

      // Set up one-time message handler for this request
      const messageHandler = (data: WebSocket.Data) => {
        if (resolved) return;

        try {
          const message = JSON.parse(data.toString());

          // Log candles-related messages for debugging
          if (message.msg_type === 'candles' || message.msg_type === 'history' || message.candles || message.error) {
            logger.info(`[Deriv] Candles response for ${ourSymbol}: msg_type=${message.msg_type}, has_candles=${!!message.candles}, candles_count=${message.candles?.length || 0}, error=${message.error?.message || 'none'}, req_id_match=${message.echo_req?.req_id === requestId}`);
          }

          // Check if this is our candles response
          const isOurResponse = message.echo_req?.req_id === requestId;

          if (isOurResponse) {
            resolved = true;
            // Remove this handler after receiving response
            this.ws?.removeListener('message', messageHandler);

            if (message.error) {
              logger.warn(`[Deriv] Candles error for ${ourSymbol}: ${message.error.message} (code: ${message.error.code})`);
              resolve([]);
              return;
            }

            if (message.candles && Array.isArray(message.candles)) {
              let candles: DerivCandle[] = message.candles.map((c: any) => ({
                time: c.epoch,
                open: parseFloat(c.open),
                high: parseFloat(c.high),
                low: parseFloat(c.low),
                close: parseFloat(c.close),
              }));

              // Sort by time ascending
              candles.sort((a, b) => a.time - b.time);

              logger.info(`[Deriv] Successfully fetched ${candles.length} candles for ${ourSymbol} (${granularity}s granularity)`);
              resolve(candles);
            } else {
              logger.warn(`[Deriv] No candles array in response for ${ourSymbol}. Response keys: ${Object.keys(message).join(', ')}`);
              resolve([]);
            }
          }
        } catch (error) {
          // Ignore parse errors from other messages
        }
      };

      // Add temporary message listener
      this.ws.on('message', messageHandler);

      // Send the ticks_history request using 'count' instead of 'start'/'end'
      // This is more reliable for getting historical data
      const request = {
        ticks_history: derivSymbol,
        style: 'candles',
        granularity: granularity,
        count: count,  // Use count for number of candles to fetch
        end: 'latest', // End at current time
        adjust_start_time: 1,
        req_id: requestId,
      };

      logger.info(`[Deriv] Requesting ${count} candles for ${ourSymbol} (${derivSymbol}), granularity=${granularity}s`);
      this.ws.send(JSON.stringify(request));

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.ws?.removeListener('message', messageHandler);
          logger.warn(`[Deriv] Candles request timeout for ${ourSymbol} after 15s`);
          resolve([]);
        }
      }, 15000);
    });
  }

  /**
   * Convert resolution in seconds to closest Deriv granularity
   */
  public static resolutionToGranularity(resolutionSeconds: number): number {
    const granularities = [60, 120, 180, 300, 600, 900, 1800, 3600, 7200, 14400, 28800, 86400];
    return granularities.reduce((prev, curr) =>
      Math.abs(curr - resolutionSeconds) < Math.abs(prev - resolutionSeconds) ? curr : prev
    );
  }

  public getDerivSymbol(symbol: string): string | null {
    return this.symbolMap.get(symbol) || null;
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

  // Wait briefly for the socket to be ready before performing one-off requests
  private async waitForConnection(timeoutMs: number = 2000): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return true;
    }

    const start = Date.now();
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 100);
    });
  }
}

// Export singleton instance
export const derivService = new DerivService();
export { DerivService };
export type { DerivCandle };
