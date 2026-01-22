import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

const getAllowedOrigins = (): string[] => {
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins && corsOrigins !== '*') {
    return corsOrigins.split(',').map(o => o.trim());
  }
  if (process.env.NODE_ENV === 'production') {
    return [
      'https://in-spectra.com',
      'https://www.in-spectra.com',
    ];
  }
  return ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006'];
};

app.use("*", cors({
  origin: (origin) => {
    // Mobile apps and native requests don't send origin - allow them
    if (!origin) return '*';
    
    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) return origin;
    
    // Allow Rork preview origins
    if (origin.includes('rork.app') || origin.includes('expo.dev') || origin.includes('expo.io')) {
      return origin;
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') return origin;
    
    // In production, still allow the request but log it
    console.log('[CORS] Unknown origin:', origin);
    return origin;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.onError((err, c) => {
  if (c.req.path.startsWith('/api/trpc')) {
    console.error('[Hono] tRPC error (letting tRPC handle it):', err.message);
    throw err;
  }
  console.error('[Hono] Error:', err);
  return c.json(
    {
      error: {
        message: err.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR',
      },
    },
    500
  );
});

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: '/api/trpc',
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  console.log('[Hono] Root endpoint hit');
  return c.json({ status: "ok", message: "API is running" });
});

app.get("/api/ping", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/health", async (c) => {
  try {
    const { healthCheck } = await import('./db');
    const isHealthy = await healthCheck();
    if (isHealthy) {
      return c.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } else {
      return c.json({ status: "error", database: "disconnected" }, 500);
    }
  } catch (error) {
    console.error('[Health] Database error:', error);
    return c.json({ status: "error", database: "disconnected", error: (error as Error).message }, 500);
  }
});

app.get("/api/health", async (c) => {
  try {
    const { healthCheck } = await import('./db');
    const isHealthy = await healthCheck();
    if (isHealthy) {
      return c.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
    } else {
      return c.json({ status: "error", database: "disconnected" }, 500);
    }
  } catch (error) {
    console.error('[Health] Database error:', error);
    return c.json({ status: "error", database: "disconnected", error: (error as Error).message }, 500);
  }
});

export default app;
