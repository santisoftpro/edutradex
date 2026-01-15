import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger.js';

// Connection pool configuration optimized for 4GB RAM VPS
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Pool size: For 4 cores, 4GB RAM, targeting 500 users
  // Formula: (cores * 2) + 1 = optimal connections per instance
  // With PM2 cluster (4 instances): 9 connections / 4 = ~2-3 per instance
  max: 20,                    // Maximum connections in pool
  min: 2,                     // Minimum connections to keep open
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s

  // Keep connections alive
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Log pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

// Query function with automatic connection handling
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    // Log slow queries (> 100ms)
    if (duration > 100) {
      logger.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: text.substring(0, 100)
      });
    }

    return result;
  } catch (error: any) {
    logger.error('Database query error', {
      error: error.message,
      query: text.substring(0, 100)
    });
    throw error;
  }
}

// Get a client for transactions
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

// Transaction isolation levels
export type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

// Transaction helper with optional isolation level
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  isolationLevel?: IsolationLevel
): Promise<T> {
  const client = await pool.connect();
  try {
    if (isolationLevel) {
      await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
    } else {
      await client.query('BEGIN');
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Serializable transaction helper for critical financial operations
export async function serializableTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transaction(callback, 'SERIALIZABLE');
    } catch (error: any) {
      lastError = error;
      // PostgreSQL serialization failure error code
      if (error.code === '40001' && attempt < maxRetries) {
        logger.warn('Serialization conflict, retrying transaction', {
          attempt,
          maxRetries,
          error: error.message
        });
        // Exponential backoff: 10ms, 20ms, 40ms
        await new Promise(resolve => setTimeout(resolve, 10 * Math.pow(2, attempt - 1)));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// Helper to get single row
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

// Helper to get multiple rows
export async function queryMany<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

// Connect to database
export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    client.release();
    logger.info('Database connected successfully', {
      maxConnections: pool.options.max,
      minConnections: pool.options.min
    });
  } catch (error: any) {
    logger.error('Database connection failed', { error: error.message });
    throw error;
  }
}

// Disconnect from database
export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error: any) {
    logger.error('Database disconnection error', { error: error.message });
  }
}

// Export pool for advanced use cases
export { pool };
