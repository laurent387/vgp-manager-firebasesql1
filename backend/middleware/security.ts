import { MiddlewareHandler } from 'hono';
import { getEnv } from '../config/env';

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (getEnv().NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
};

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter: MiddlewareHandler = async (c, next) => {
  const env = getEnv();
  const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS, 10);
  const maxRequests = parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10);
  
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 
                   c.req.header('x-real-ip') || 
                   'unknown';
  
  const now = Date.now();
  const record = rateLimitStore.get(clientIp);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(clientIp, { count: 1, resetTime: now + windowMs });
  } else {
    record.count++;
    
    if (record.count > maxRequests) {
      c.header('Retry-After', String(Math.ceil((record.resetTime - now) / 1000)));
      c.header('X-RateLimit-Limit', String(maxRequests));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(record.resetTime));
      
      return c.json({
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      }, 429);
    }
  }
  
  const currentRecord = rateLimitStore.get(clientIp)!;
  c.header('X-RateLimit-Limit', String(maxRequests));
  c.header('X-RateLimit-Remaining', String(Math.max(0, maxRequests - currentRecord.count)));
  c.header('X-RateLimit-Reset', String(currentRecord.resetTime));
  
  await next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
