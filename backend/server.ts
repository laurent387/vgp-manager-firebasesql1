import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { trpcServer } from '@hono/trpc-server';

import { getEnv, isProduction } from './config/env';
import { healthCheck, closePool } from './config/database';
import { securityHeaders, rateLimiter } from './middleware/security';
import { requestLogger, logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import { appRouter } from './trpc/app-router';
import { createContext } from './trpc/create-context';

const app = new Hono();

const env = getEnv();

const corsOrigins = env.CORS_ORIGINS === '*' 
  ? '*' 
  : env.CORS_ORIGINS.split(',').map(o => o.trim());

app.use('*', cors({
  origin: corsOrigins,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposeHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));

app.use('*', securityHeaders);
app.use('*', requestLogger);

if (isProduction()) {
  app.use('/api/*', rateLimiter);
}

app.onError(errorHandler);

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'VGP API is running',
    version: env.API_VERSION,
    environment: env.NODE_ENV,
  });
});

app.get('/health', async (c) => {
  const dbHealthy = await healthCheck();
  const status = dbHealthy ? 'healthy' : 'unhealthy';
  const statusCode = dbHealthy ? 200 : 503;
  
  return c.json({
    status,
    timestamp: new Date().toISOString(),
    version: env.API_VERSION,
    checks: {
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  }, statusCode);
});

app.get('/api/ping', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use(
  '/api/trpc/*',
  trpcServer({
    endpoint: '/api/trpc',
    router: appRouter,
    createContext,
    onError({ error, path }) {
      logger.error(`tRPC error on ${path}`, {
        message: error.message,
        code: error.code,
      });
    },
  })
);

app.notFound((c) => {
  return c.json({
    error: {
      message: 'Not found',
      code: 'NOT_FOUND',
    },
  }, 404);
});

const port = parseInt(env.PORT, 10);

logger.info(`Starting VGP API server`, {
  port,
  environment: env.NODE_ENV,
  version: env.API_VERSION,
});

serve({
  fetch: app.fetch,
  port,
});

logger.info(`Server running at http://localhost:${port}`);

async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  try {
    await closePool();
    logger.info('Database pool closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

export default app;
