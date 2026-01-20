import { MiddlewareHandler } from 'hono';
import { getEnv } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const configLevel = getEnv().LOG_LEVEL as LogLevel;
  return LOG_LEVELS[level] >= LOG_LEVELS[configLevel];
}

function formatLog(level: LogLevel, message: string, meta?: Record<string, any>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: Record<string, any>) => {
    if (shouldLog('debug')) console.debug(formatLog('debug', message, meta));
  },
  info: (message: string, meta?: Record<string, any>) => {
    if (shouldLog('info')) console.log(formatLog('info', message, meta));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    if (shouldLog('warn')) console.warn(formatLog('warn', message, meta));
  },
  error: (message: string, meta?: Record<string, any>) => {
    if (shouldLog('error')) console.error(formatLog('error', message, meta));
  },
};

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  const method = c.req.method;
  const path = c.req.path;
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
             c.req.header('x-real-ip') || 
             'unknown';
  
  logger.info(`→ ${method} ${path}`, { requestId, ip, userAgent: userAgent.substring(0, 50) });
  
  c.set('requestId', requestId);
  
  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    const status = c.res.status;
    
    const logFn = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
    logFn(`← ${method} ${path} ${status}`, { requestId, duration: `${duration}ms` });
  }
};
