import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
  waitForConnections: boolean;
  queueLimit: number;
  enableKeepAlive: boolean;
  keepAliveInitialDelay: number;
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'vgpdb',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...(isProduction && process.env.DB_SSL === 'true' && {
      ssl: {
        rejectUnauthorized: false,
      },
    }),
  };
}

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    console.log('[DB] Creating pool with config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      connectionLimit: config.connectionLimit,
      ssl: !!config.ssl,
    });
    pool = mysql.createPool(config);
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
    const [rows] = await p.execute(sql, params);
    const duration = Date.now() - start;
    const rowsArray = Array.isArray(rows) ? rows : [];
    
    if (duration > 1000) {
      console.warn('[DB] Slow query detected', { duration, sql: sql.substring(0, 100) });
    }
    
    console.log('[DB] Query completed', { duration, rows: rowsArray.length });
    return { rows: rowsArray as T[], rowCount: rowsArray.length };
  } catch (error: any) {
    console.error('[DB] Query error', {
      sql: sql.substring(0, 100),
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

export async function getConnection(): Promise<mysql.PoolConnection> {
  return getPool().getConnection();
}

export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    const connection = await getConnection();
    await connection.ping();
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
