import { WebSocket } from 'ws';
import { logger } from '../../utils/logger.js';
import { PriceTick } from '../market/market.service.js';

interface Client {
  ws: WebSocket;
  id: string;
  userId?: string;
  subscribedSymbols: Set<string>;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
}

class WebSocketManager {
  private clients: Map<string, Client> = new Map();
  private userClients: Map<string, Set<string>> = new Map(); // userId -> Set of clientIds
  private symbolSubscribers: Map<string, Set<string>> = new Map();

  addClient(ws: WebSocket, clientId: string): void {
    const client: Client = {
      ws,
      id: clientId,
      subscribedSymbols: new Set(),
    };
    this.clients.set(clientId, client);
    logger.info('Client added to WebSocket manager', { clientId, totalClients: this.clients.size });
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all symbols
    client.subscribedSymbols.forEach((symbol) => {
      this.unsubscribeFromSymbol(clientId, symbol);
    });

    // Remove from user clients mapping
    if (client.userId) {
      const userClientSet = this.userClients.get(client.userId);
      if (userClientSet) {
        userClientSet.delete(clientId);
        if (userClientSet.size === 0) {
          this.userClients.delete(client.userId);
        }
      }
    }

    this.clients.delete(clientId);
    logger.info('Client removed from WebSocket manager', { clientId, totalClients: this.clients.size });
  }

  authenticateClient(clientId: string, userId: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn('Client not found for authentication', { clientId, userId });
      return;
    }

    // Set userId on client
    client.userId = userId;

    // Add to user clients mapping
    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    this.userClients.get(userId)!.add(clientId);

    logger.info('Client authenticated', { clientId, userId });

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'authenticated',
      payload: { userId, timestamp: Date.now() },
    });
  }

  sendToUser(userId: string, message: WebSocketMessage): void {
    const clientIds = this.userClients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      logger.debug('No connected clients for user', { userId });
      return;
    }

    clientIds.forEach((clientId) => {
      this.sendToClient(clientId, message);
    });

    logger.debug('Message sent to user', { userId, clientCount: clientIds.size, type: message.type });
  }

  notifyWithdrawalUpdate(userId: string, withdrawal: {
    id: string;
    amount: number;
    status: 'APPROVED' | 'REJECTED';
    method: string;
    adminNote?: string;
  }): void {
    this.sendToUser(userId, {
      type: 'withdrawal_update',
      payload: {
        ...withdrawal,
        timestamp: Date.now(),
      },
    });
  }

  notifyDepositUpdate(userId: string, deposit: {
    id: string;
    amount: number;
    status: 'APPROVED' | 'REJECTED';
    method: string;
    adminNote?: string;
  }): void {
    this.sendToUser(userId, {
      type: 'deposit_update',
      payload: {
        ...deposit,
        timestamp: Date.now(),
      },
    });
  }

  // Copy Trading Notifications

  notifyCopyTradeExecuted(userId: string, data: {
    copiedTradeId: string;
    originalTradeId: string;
    symbol: string;
    direction: string;
    amount: number;
    leaderName: string;
  }): void {
    this.sendToUser(userId, {
      type: 'copy_trade_executed',
      payload: {
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  notifyPendingCopyTrade(userId: string, data: {
    pendingTradeId: string;
    originalTradeId: string;
    symbol: string;
    direction: string;
    suggestedAmount: number;
    leaderName: string;
    expiresAt: Date;
  }): void {
    this.sendToUser(userId, {
      type: 'pending_copy_trade',
      payload: {
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  notifyLeaderTraded(userId: string, data: {
    leaderId: string;
    leaderName: string;
    symbol: string;
    direction: string;
  }): void {
    this.sendToUser(userId, {
      type: 'leader_placed_trade',
      payload: {
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  notifyLeaderStatusChange(userId: string, data: {
    leaderId: string;
    status: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    adminNote?: string;
  }): void {
    this.sendToUser(userId, {
      type: 'leader_status_change',
      payload: {
        ...data,
        timestamp: Date.now(),
      },
    });
  }

  subscribeToSymbol(clientId: string, symbol: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn('Client not found for subscription', { clientId, symbol });
      return;
    }

    // Add symbol to client's subscriptions
    client.subscribedSymbols.add(symbol);

    // Add client to symbol's subscribers
    if (!this.symbolSubscribers.has(symbol)) {
      this.symbolSubscribers.set(symbol, new Set());
    }
    this.symbolSubscribers.get(symbol)!.add(clientId);

    logger.debug('Client subscribed to symbol', {
      clientId,
      symbol,
      totalSubscriptions: client.subscribedSymbols.size
    });

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'subscribed',
      payload: { symbol, timestamp: Date.now() },
    });
  }

  unsubscribeFromSymbol(clientId: string, symbol: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove symbol from client's subscriptions
    client.subscribedSymbols.delete(symbol);

    // Remove client from symbol's subscribers
    const subscribers = this.symbolSubscribers.get(symbol);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.symbolSubscribers.delete(symbol);
      }
    }

    logger.debug('Client unsubscribed from symbol', {
      clientId,
      symbol,
      remainingSubscriptions: client.subscribedSymbols.size
    });

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      payload: { symbol, timestamp: Date.now() },
    });
  }

  broadcastPriceUpdate(priceTick: PriceTick): void {
    const subscribers = this.symbolSubscribers.get(priceTick.symbol);
    if (!subscribers || subscribers.size === 0) return;

    const message: WebSocketMessage = {
      type: 'price_update',
      payload: priceTick,
    };

    subscribers.forEach((clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  broadcastAllPrices(priceTicks: PriceTick[]): void {
    priceTicks.forEach((tick) => {
      this.broadcastPriceUpdate(tick);
    });
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error sending message to client', {
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  sendToAll(message: WebSocketMessage): void {
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error('Error broadcasting to client', {
            clientId: client.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getSubscriptionCount(symbol: string): number {
    return this.symbolSubscribers.get(symbol)?.size || 0;
  }

  getAllSubscriptions(): Map<string, number> {
    const subscriptions = new Map<string, number>();
    this.symbolSubscribers.forEach((subscribers, symbol) => {
      subscriptions.set(symbol, subscribers.size);
    });
    return subscriptions;
  }
}

export const wsManager = new WebSocketManager();
export type { WebSocketMessage };
