import type { Pool } from 'pg';

type Container = {
  resolve<T = unknown>(key: string): T;
};

let dbPool: Pool | null = null;

function getDbPool(): Pool {
  if (!dbPool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    try {
      const { Pool } = require('pg');
      dbPool = new Pool({ connectionString: databaseUrl });
    } catch {
      throw new Error('pg module not available');
    }
  }
  return dbPool;
}

type QueryResult = {
  rows: unknown[];
  length?: number;
};

interface ConnectionWithExecute {
  execute: (sql: string, params: unknown[]) => Promise<QueryResult>;
}

interface ManagerWithExecute {
  execute: (sql: string, params: unknown[]) => Promise<QueryResult>;
}

interface ManagerWithConnection {
  getConnection: () => ConnectionWithExecute;
}

function isManagerWithExecute(manager: unknown): manager is ManagerWithExecute {
  return (
    manager !== null &&
    typeof manager === 'object' &&
    'execute' in manager &&
    typeof (manager as ManagerWithExecute).execute === 'function'
  );
}

function isManagerWithConnection(manager: unknown): manager is ManagerWithConnection {
  return (
    manager !== null &&
    typeof manager === 'object' &&
    'getConnection' in manager &&
    typeof (manager as ManagerWithConnection).getConnection === 'function'
  );
}

function isConnectionWithExecute(connection: unknown): connection is ConnectionWithExecute {
  return (
    connection !== null &&
    typeof connection === 'object' &&
    'execute' in connection &&
    typeof (connection as ConnectionWithExecute).execute === 'function'
  );
}

async function executeQuery(container: Container, sql: string, params: unknown[] = []): Promise<QueryResult> {
  try {
    const manager = container.resolve('manager');
    if (isManagerWithExecute(manager)) {
      return await manager.execute(sql, params);
    }
    if (isManagerWithConnection(manager)) {
      const connection = manager.getConnection();
      if (isConnectionWithExecute(connection)) {
        return await connection.execute(sql, params);
      }
    }
  } catch {
    // fallback
  }

  try {
    const pool = getDbPool();
    return await pool.query(sql, params);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to execute query: ${errorMessage}`);
  }
}

export async function isOperationIdempotent(
  container: Container,
  productId: string,
  language: string,
  operation: 'index' | 'delete',
  ttlSeconds: number = 30,
): Promise<boolean> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const sql = `
    WITH cleanup AS (
      DELETE FROM algolia_idempotency WHERE expires_at <= NOW()
    )
    INSERT INTO algolia_idempotency (id, operation, product_id, language, executed_at, expires_at, created_at)
    SELECT $1, $2, $3, $4, $5, $6, $7
    WHERE NOT EXISTS (
      SELECT 1 FROM algolia_idempotency 
      WHERE operation = $2 
        AND product_id = $3 
        AND language = $4 
        AND expires_at > NOW()
    )
    RETURNING id;
  `;

  const id = `${operation}:${productId}:${language}:${Date.now()}`;

  try {
    const result = await executeQuery(container, sql, [id, operation, productId, language, now, expiresAt, now]);

    return !result || (Array.isArray(result) && result.length === 0) || (result.rows && result.rows.length === 0);
  } catch {
    return false;
  }
}

export async function markOperationAsExecuted(
  container: Container,
  productId: string,
  language: string,
  operation: 'index' | 'delete',
  ttlSeconds: number = 30,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const sql = `
    WITH cleanup AS (
      DELETE FROM algolia_idempotency WHERE expires_at <= NOW()
    )
    INSERT INTO algolia_idempotency (id, operation, product_id, language, executed_at, expires_at, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (operation, product_id, language)
    DO UPDATE SET executed_at = $5, expires_at = $6;
  `;

  const id = `${operation}:${productId}:${language}:${Date.now()}`;

  try {
    await executeQuery(container, sql, [id, operation, productId, language, now, expiresAt, now]);
  } catch {
    // ignore
  }
}

export async function acquireLock(
  container: Container,
  lockKey: string,
  ownerId: string,
  ttlSeconds: number = 300,
): Promise<{ acquired: boolean; ownerId: string }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const sql = `
    WITH cleanup AS (
      DELETE FROM algolia_lock WHERE expires_at <= NOW()
    )
    INSERT INTO algolia_lock (id, lock_key, owner_id, acquired_at, expires_at, created_at, updated_at)
    SELECT $1, $2, $3, $4, $5, $6, $7
    WHERE NOT EXISTS (
      SELECT 1 FROM algolia_lock 
      WHERE lock_key = $2 AND expires_at > NOW()
    )
    RETURNING id;
  `;

  const id = `lock:${lockKey}:${Date.now()}`;

  try {
    const result = await executeQuery(container, sql, [id, lockKey, ownerId, now, expiresAt, now, now]);

    const acquired =
      result &&
      ((Array.isArray(result) && result.length > 0) || (result.rows && result.rows.length > 0) || result.length > 0);

    return { acquired, ownerId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to acquire lock: ${errorMessage}`);
  }
}

export async function releaseLock(container: Container, lockKey: string, ownerId: string): Promise<void> {
  const sql = `
    DELETE FROM algolia_lock 
    WHERE lock_key = $1 AND owner_id = $2;
  `;

  try {
    await executeQuery(container, sql, [lockKey, ownerId]);
  } catch {
    // ignore
  }
}

export async function canExecuteSync(
  container: Container,
  language: string,
  maxTokens: number = 1,
  refillRate: number = 1 / 60,
  windowMs: number = 60000,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const rateKey = `sync:${language}`;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;

  await executeQuery(container, `DELETE FROM algolia_rate_limit WHERE expires_at <= now();`, []);

  const selectSql = `
    SELECT tokens, last_refill, expires_at
    FROM algolia_rate_limit
    WHERE rate_key = $1
    FOR UPDATE;
  `;

  const bucket = await executeQuery(container, selectSql, [rateKey]);
  let tokens = maxTokens;
  let lastRefill = now;

  if (bucket && ((Array.isArray(bucket) && bucket.length > 0) || (bucket.rows && bucket.rows.length > 0))) {
    const row = Array.isArray(bucket) ? bucket[0] : bucket.rows[0];
    tokens = row.tokens || 0;
    lastRefill = new Date(row.last_refill).getTime();

    const elapsed = (now - lastRefill) / 1000.0;
    const tokensToAdd = Math.floor(elapsed * refillRate);

    if (tokensToAdd > 0) {
      tokens = Math.min(tokens + tokensToAdd, maxTokens);
      lastRefill = now;
    }
  }

  let allowed = false;
  let remaining = tokens;

  if (tokens >= 1) {
    tokens = tokens - 1;
    allowed = true;
    remaining = tokens;
  }

  const expiresAt = new Date(now + windowMs);
  const upsertSql = `
    INSERT INTO algolia_rate_limit (id, rate_key, tokens, last_refill, window_start, expires_at, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (rate_key)
    DO UPDATE SET 
      tokens = $3,
      last_refill = $4,
      expires_at = $6,
      updated_at = $8;
  `;

  const id = `ratelimit:${rateKey}:${windowStart}`;

  await executeQuery(container, upsertSql, [
    id,
    rateKey,
    remaining,
    new Date(lastRefill),
    new Date(windowStart),
    expiresAt,
    new Date(),
    new Date(),
  ]);

  const resetAt = now + windowMs;

  return { allowed, remaining, resetAt };
}

export async function recordAlgoliaRequest(
  _container: Container,
  _operation: string,
  _count: number = 1,
): Promise<void> {
  // placeholder
}

export async function shouldFailFast(_container: Container): Promise<boolean> {
  return false;
}

export function generateOwnerId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
