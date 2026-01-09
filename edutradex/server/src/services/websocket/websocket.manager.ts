import { WebSocket } from 'ws';
import { logger } from '../../utils/logger.js';
import { PriceTick } from '../market/market.service.js';

// Throttle price broadcasts to max 10 per second per symbol
const PRICE_BROADCAST_THROTTLE_MS = 100;

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

  // Throttling state for price broadcasts
  private lastPriceBroadcast: Map<string, number> = new Map();
  private pendingPriceUpdates: Map<string, PriceTick> = new Map();
  private priceUpdateTimers: Map<string, NodeJS.Timeout> = new Map();

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

    logger.info('Client authenticated', {
      clientId,
      userId,
      totalAuthenticatedUsers: this.userClients.size,
      userClientCount: this.userClients.get(userId)?.size,
    });

    // Send confirmation
    this.sendToClient(clientId, {
      type: 'authenticated',
      payload: { userId, timestamp: Date.now() },
    });
  }

  sendToUser(userId: string, message: WebSocketMessage): void {
    const clientIds = this.userClients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      logger.warn('No connected clients for user - message not delivered', {
        userId,
        messageType: message.type,
        totalAuthenticatedUsers: this.userClients.size
      });
      return;
    }

    clientIds.forEach((clientId) => {
      this.sendToClient(clientId, message);
    });

    logger.info('Message sent to user', { userId, clientCount: clientIds.size, type: message.type });
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
    logger.info('Sending deposit notification', {
      userId,
      depositId: deposit.id,
      status: deposit.status,
      amount: deposit.amount,
      connectedUsers: this.userClients.size,
      userHasConnections: this.userClients.has(userId),
    });
    this.sendToUser(userId, {
      type: 'deposit_update',
      payload: {
        ...deposit,
        timestamp: Date.now(),
      },
    });
  }

  // Trade Notifications
  notifyTradeUpdate(userId: string, trade: {
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    status: 'OPEN' | 'CLOSED';
    result?: 'WON' | 'LOST' | null;
    profit?: number | null;
    exitPrice?: number | null;
  }): void {
    this.sendToUser(userId, {
      type: 'trade_update',
      payload: {
        ...trade,
        timestamp: Date.now(),
      },
    });
  }

  notifyTradeSettled(userId: string, trade: {
    id: string;
    symbol: string;
    direction: string;
    amount: number;
    result: 'WON' | 'LOST';
    profit: number;
    exitPrice: number;
  }): void {
    logger.info('Sending trade_settled notification', {
      userId,
      tradeId: trade.id,
      result: trade.result,
      profit: trade.profit
    });
    this.sendToUser(userId, {
      type: 'trade_settled',
      payload: {
        ...trade,
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

  // Support Ticket Notifications
  notifyTicketReply(userId: string, data: {
    ticketId: string;
    ticketNumber: string;
    subject: string;
    isClosed: boolean;
  }): void {
    this.sendToUser(userId, {
      type: 'ticket_reply',
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

    const symbol = priceTick.symbol;
    const now = Date.now();
    const lastBroadcast = this.lastPriceBroadcast.get(symbol) || 0;
    const timeSinceLastBroadcast = now - lastBroadcast;

    // Always store the latest price (we'll send the most recent one)
    this.pendingPriceUpdates.set(symbol, priceTick);

    // If enough time has passed, broadcast immediately
    if (timeSinceLastBroadcast >= PRICE_BROADCAST_THROTTLE_MS) {
      this.sendPriceUpdate(symbol);
    } else {
      // Schedule a broadcast if one isn't already scheduled
      if (!this.priceUpdateTimers.has(symbol)) {
        const delay = PRICE_BROADCAST_THROTTLE_MS - timeSinceLastBroadcast;
        const timer = setTimeout(() => {
          this.priceUpdateTimers.delete(symbol);
          this.sendPriceUpdate(symbol);
        }, delay);
        this.priceUpdateTimers.set(symbol, timer);
      }
      // If timer exists, it will send the latest pending update when it fires
    }
  }

  private sendPriceUpdate(symbol: string): void {
    const priceTick = this.pendingPriceUpdates.get(symbol);
    if (!priceTick) return;

    const subscribers = this.symbolSubscribers.get(symbol);
    if (!subscribers || subscribers.size === 0) {
      this.pendingPriceUpdates.delete(symbol);
      return;
    }

    const message: WebSocketMessage = {
      type: 'price_update',
      payload: priceTick,
    };

    subscribers.forEach((clientId) => {
      this.sendToClient(clientId, message);
    });

    this.lastPriceBroadcast.set(symbol, Date.now());
    this.pendingPriceUpdates.delete(symbol);
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

  // Get all online (connected) user IDs
  getOnlineUserIds(): string[] {
    return Array.from(this.userClients.keys());
  }

  // Check if a specific user is online
  isUserOnline(userId: string): boolean {
    return this.userClients.has(userId) && this.userClients.get(userId)!.size > 0;
  }

  // Get count of online users
  getOnlineUserCount(): number {
    return this.userClients.size;
  }

  // Get detailed online user info
  getOnlineUsersInfo(): { userId: string; connectionCount: number }[] {
    const users: { userId: string; connectionCount: number }[] = [];
    this.userClients.forEach((clientIds, userId) => {
      users.push({ userId, connectionCount: clientIds.size });
    });
    return users;
  }

  // Financial Updates Broadcasting
  broadcastFinancialUpdate(data: {
    type: 'realtime_metrics' | 'daily_snapshot' | 'monthly_report' | 'alert';
    payload: Record<string, unknown>;
  }): void {
    const message: WebSocketMessage = {
      type: 'financial_update',
      payload: {
        ...data,
        timestamp: Date.now(),
      },
    };

    // Broadcast to all authenticated clients (superadmins will filter on frontend)
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.userId && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
          sentCount++;
        } catch (error) {
          logger.error('Error broadcasting financial update', {
            clientId: client.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });

    logger.debug('Financial update broadcast', {
      type: data.type,
      sentTo: sentCount,
    });
  }

  // Notify specific users about financial alerts
  notifyFinancialAlert(userIds: string[], alert: {
    alertType: 'high_exposure' | 'daily_loss_limit' | 'unusual_activity';
    message: string;
    severity: 'warning' | 'critical';
    data?: Record<string, unknown>;
  }): void {
    userIds.forEach((userId) => {
      this.sendToUser(userId, {
        type: 'financial_alert',
        payload: {
          ...alert,
          timestamp: Date.now(),
        },
      });
    });

    logger.info('Financial alert sent', {
      alertType: alert.alertType,
      severity: alert.severity,
      recipientCount: userIds.length,
    });
  }
}

export const wsManager = new WebSocketManager();
export type { WebSocketMessage };
