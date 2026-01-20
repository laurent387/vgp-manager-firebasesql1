import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'vgp',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

console.log('[DB] Initializing pool with config:', {
  host: dbConfig.host,
  database: dbConfig.database,
  user: dbConfig.user,
  hasPassword: !!dbConfig.password,
});

let pool: mysql.Pool;

try {
  pool = mysql.createPool(dbConfig);
  console.log('[DB] Pool created successfully');
} catch (error) {
  console.error('[DB] Failed to create pool:', error);
  throw error;
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  if (!pool) {
    console.error('[DB] Pool not initialized');
    throw new Error('Database pool not initialized');
  }
  
  const start = Date.now();
  try {
    console.log('[DB] Executing query:', text.substring(0, 100));
    const [rows] = await pool.execute(text, params);
    const duration = Date.now() - start;
    const rowsArray = Array.isArray(rows) ? rows : [];
    console.log('[DB] Query completed', { duration, rows: rowsArray.length });
    return { rows: rowsArray as T[], rowCount: rowsArray.length };
  } catch (error: any) {
    console.error('[DB] Error executing query', { 
      text: text.substring(0, 100), 
      error: error.message,
      code: error.code,
      errno: error.errno 
    });
    throw error;
  }
}

export async function getClient() {
  return await pool.getConnection();
}

export { pool };
