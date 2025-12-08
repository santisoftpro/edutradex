import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

// Config must be imported first - it loads dotenv
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import routes from './routes/index.js';
import { wsManager } from './services/websocket/websocket.manager.js';
import { emailService } from './services/email/email.service.js';
import { commissionScheduler } from './services/scheduler/commission.scheduler.js';
import { tradeSettlementScheduler } from './services/scheduler/trade.scheduler.js';

// Constants
const REQUEST_BODY_LIMIT = '10mb';

// Initialize Express app
const app = express();
const server: Server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.client.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - General API limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // High limit to handle rapid trading and polling
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});

// Apply rate limiting (auth rate limiting disabled for testing phase)
app.use('/api', apiLimiter);

// Body parsing with size limits
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

// Serve static files for uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Set proper headers for PDFs to allow inline viewing
  if (req.path.toLowerCase().endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
  }
  next();
}, express.static('uploads', {
  setHeaders: (res, filePath) => {
    // Ensure PDFs are served with correct MIME type
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Request logging middleware (skip frequent polling endpoints)
app.use((req: Request, _res: Response, next: NextFunction) => {
  // Skip logging for frequent polling requests to reduce noise
  const skipPaths = ['/api/trades/active', '/api/trades/stats', '/api/market'];
  if (!skipPaths.some(p => req.path.startsWith(p))) {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      ip: req.ip
    });
  }
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'OptigoBroker API',
    version: '1.0.0',
    description: 'Demo Forex & OTC Trading Platform API',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      trades: '/api/trades',
      market: '/api/market',
      admin: '/api/admin'
    }
  });
});

// Mount API routes
app.use('/api', routes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource does not exist'
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: config.isDevelopment ? err.stack : undefined
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.isDevelopment ? err.message : 'An unexpected error occurred'
  });
});

// WebSocket setup
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  const clientId = randomUUID();
  wsManager.addClient(ws, clientId);

  logger.info('WebSocket client connected', { clientId, totalClients: wsManager.getClientCount() });

  ws.send(JSON.stringify({
    type: 'connected',
    payload: {
      clientId,
      message: 'Connected to OptigoBroker WebSocket',
      timestamp: Date.now()
    }
  }));

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('WebSocket message received', { clientId, type: message.type });

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            payload: { timestamp: Date.now() }
          }));
          break;

        case 'authenticate':
          logger.info('WebSocket authentication attempt', { clientId, hasToken: !!message.payload?.token });
          if (message.payload?.token) {
            try {
              const decoded = jwt.verify(message.payload.token, config.jwt.secret) as { userId: string; email: string; role: string };
              logger.info('Token verified successfully', { clientId, userId: decoded.userId });
              wsManager.authenticateClient(clientId, decoded.userId);
              logger.info('WebSocket client authenticated', { clientId, userId: decoded.userId });
            } catch (error) {
              logger.error('Token verification failed', { clientId, error: (error as Error).message });
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Invalid authentication token' }
              }));
            }
          } else {
            logger.warn('No token provided for authentication', { clientId });
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Token is required for authentication' }
            }));
          }
          break;

        case 'subscribe':
          if (message.payload?.symbol) {
            wsManager.subscribeToSymbol(clientId, message.payload.symbol);
            logger.info('Client subscribed to symbol', {
              clientId,
              symbol: message.payload.symbol
            });
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Symbol is required for subscription' }
            }));
          }
          break;

        case 'unsubscribe':
          if (message.payload?.symbol) {
            wsManager.unsubscribeFromSymbol(clientId, message.payload.symbol);
            logger.info('Client unsubscribed from symbol', {
              clientId,
              symbol: message.payload.symbol
            });
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Symbol is required for unsubscription' }
            }));
          }
          break;

        case 'subscribe_all':
          // Subscribe to all available market symbols
          const symbols = message.payload?.symbols || [];
          if (Array.isArray(symbols) && symbols.length > 0) {
            symbols.forEach((symbol: string) => {
              wsManager.subscribeToSymbol(clientId, symbol);
            });
            logger.info('Client subscribed to multiple symbols', {
              clientId,
              count: symbols.length
            });
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Symbols array is required' }
            }));
          }
          break;

        default:
          logger.debug('Unhandled WebSocket message type', { type: message.type });
      }
    } catch (error) {
      logger.error('WebSocket message parse error', { clientId, error });
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' }
      }));
    }
  });

  ws.on('error', (error: Error) => {
    logger.error('WebSocket error', { clientId, message: error.message });
  });

  ws.on('close', () => {
    wsManager.removeClient(clientId);
    logger.info('WebSocket client disconnected', { clientId });
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

  // Stop schedulers
  commissionScheduler.stop();
  tradeSettlementScheduler.stop();

  // Close WebSocket server
  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  // Disconnect database
  await disconnectDatabase();

  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('CRITICAL: Uncaught exception', {
    message: error.message,
    stack: error.stack,
    type: error.name
  });

  // Don't exit immediately - log the error and continue
  // In production with PM2, PM2 will restart if needed
  if (config.isProduction) {
    logger.warn('Server continuing despite uncaught exception (PM2 will restart if needed)');
  } else {
    // In development, exit to surface the error clearly
    logger.error('Exiting in development mode to surface the error');
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('CRITICAL: Unhandled promise rejection', {
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      name: reason.name
    } : reason,
    promise: String(promise)
  });

  // Don't exit immediately - log the error and continue
  // Most unhandled rejections are non-fatal (failed API calls, db queries, etc)
  if (config.isProduction) {
    logger.warn('Server continuing despite unhandled rejection');
  } else {
    // In development, exit after a delay to surface the error
    logger.error('Exiting in 5 seconds in development mode...');
    setTimeout(() => process.exit(1), 5000);
  }
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Initialize email service
    emailService.initialize(config.email);

    // Connect to database
    await connectDatabase();

    // Start commission scheduler (runs every 24 hours)
    commissionScheduler.start();

    // Start trade settlement scheduler (runs every 5 seconds to catch expired trades)
    tradeSettlementScheduler.start();

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info('OptigoBroker Server started', {
        port: config.port,
        environment: config.nodeEnv,
        httpUrl: `http://localhost:${config.port}`,
        wsUrl: `ws://localhost:${config.port}/ws`,
        healthCheck: `http://localhost:${config.port}/health`
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export { app, server, wss };
