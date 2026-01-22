import { Pool, PoolClient } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    ssl: isProduction || process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false,
    } : undefined,
  };
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    console.log('[DB] Creating PostgreSQL pool with config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      max: config.max,
      ssl: !!config.ssl,
    });
    pool = new Pool(config);
    console.log('[DB] Pool created successfully');
  }
  return pool;
}

export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const p = getPool();
  const start = Date.now();

  try {
    const result = await p.query(sql, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn('[DB] Slow query detected', { duration, sql: sql.substring(0, 100) });
    }

    console.log('[DB] Query completed', { duration, rows: result.rowCount });
    return { rows: result.rows as T[], rowCount: result.rowCount || 0 };
  } catch (error: any) {
    console.error('[DB] Query error', {
      sql: sql.substring(0, 100),
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

export async function getConnection(): Promise<PoolClient> {
  return getPool().connect();
}

export async function transaction<T>(
  callback: (connection: PoolClient) => Promise<T>
): Promise<T> {
  const connection = await getConnection();

  try {
    await connection.query('BEGIN');
    const result = await callback(connection);
    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const connection = await getConnection();
    await connection.query('SELECT 1');
    connection.release();
    return true;
  } catch {
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Pool closed');
  }
}
