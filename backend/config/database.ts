import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit: number;
  ssl?: {
    rejectUnauthorized: boolean;
  };
}

export function getDatabaseConfig(): DatabaseConfig {
  const enableSsl = process.env.DB_SSL === 'true';

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'vgp',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    ssl: enableSsl ? {
      rejectUnauthorized: false,
    } : undefined,
  };
}

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    console.log('[DB] Creating MySQL pool with config:', {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      connectionLimit: config.connectionLimit,
      ssl: !!config.ssl,
    });
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: config.connectionLimit,
      ssl: config.ssl,
      waitForConnections: true,
      queueLimit: 0,
    });
    console.log('[DB] MySQL pool created successfully');
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
    const [rows] = await p.execute<RowDataPacket[]>(sql, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn('[DB] Slow query detected', { duration, sql: sql.substring(0, 100) });
    }

    const resultRows = Array.isArray(rows) ? rows : [];
    console.log('[DB] Query completed', { duration, rows: resultRows.length });
    return { rows: resultRows as T[], rowCount: resultRows.length };
  } catch (error: any) {
    console.error('[DB] Query error', {
      sql: sql.substring(0, 100),
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

export async function execute(
  sql: string,
  params?: any[]
): Promise<{ affectedRows: number; insertId: number }> {
  const p = getPool();
  const start = Date.now();

  try {
    const [result] = await p.execute<ResultSetHeader>(sql, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn('[DB] Slow query detected', { duration, sql: sql.substring(0, 100) });
    }

    console.log('[DB] Execute completed', { duration, affectedRows: result.affectedRows });
    return { affectedRows: result.affectedRows, insertId: result.insertId };
  } catch (error: any) {
    console.error('[DB] Execute error', {
      sql: sql.substring(0, 100),
      error: error.message,
      code: error.code,
    });
    throw error;
  }
}

export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

export async function transaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
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
    await connection.query('SELECT 1');
    connection.release();
    console.log('[DB] Health check passed');
    return true;
  } catch (error: any) {
    console.error('[DB] Health check failed', { error: error.message });
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
