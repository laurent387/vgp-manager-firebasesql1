import { getPool, query as dbQuery, getConnection, transaction, healthCheck, closePool } from './config/database';

export const pool = getPool();
export const query = dbQuery;
export const getClient = getConnection;
export { transaction, healthCheck, closePool };
