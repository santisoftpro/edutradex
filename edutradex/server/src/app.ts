import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

// Config must be imported first - it loads dotenv
import { config } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import routes from './routes/index.js';

// Constants
const REQUEST_BODY_LIMIT = '10mb';

// Initialize Express app
const app = express();
const server: Server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.isProduction ? undefined : false
}));

app.use(cors({
  origin: config.client.url,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with size limits
app.use(express.json({ limit: REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
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
    name: 'EduTradeX API',
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
  logger.info('WebSocket client connected');

  ws.send(JSON.stringify({
    type: 'connected',
    payload: {
      message: 'Connected to EduTradeX WebSocket',
      timestamp: Date.now()
    }
  }));

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      logger.debug('WebSocket message received', { type: message.type });

      switch (message.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            payload: { timestamp: Date.now() }
          }));
          break;
        default:
          logger.debug('Unhandled WebSocket message type', { type: message.type });
      }
    } catch (error) {
      logger.error('WebSocket message parse error', { error });
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' }
      }));
    }
  });

  ws.on('error', (error: Error) => {
    logger.error('WebSocket error', { message: error.message });
  });

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
  });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

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
  logger.error('Uncaught exception', { message: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info('EduTradeX Server started', {
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
