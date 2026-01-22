import { getPool, query as dbQuery, getConnection, transaction, healthCheck, closePool } from './config/database';

// Lazy getter for pool - only creates when actually needed
export const getPoolLazy = () => getPool();
export const query = dbQuery;
export const getClient = getConnection;
export { transaction, healthCheck, closePool };

// For backwards compatibility, but avoid using directly
export const pool = {
  get instance() {
    return getPool();
  }
};
