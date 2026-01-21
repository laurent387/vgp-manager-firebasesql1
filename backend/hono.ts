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
    const allowed = getAllowedOrigins();
    if (!origin) return allowed[0];
    if (allowed.includes(origin)) return origin;
    if (process.env.NODE_ENV !== 'production') return origin;
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
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
    const { pool } = await import('./db');
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return c.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[Health] Database error:', error);
    return c.json({ status: "error", database: "disconnected", error: (error as Error).message }, 500);
  }
});

app.get("/api/health", async (c) => {
  try {
    const { pool } = await import('./db');
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return c.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[Health] Database error:', error);
    return c.json({ status: "error", database: "disconnected", error: (error as Error).message }, 500);
  }
});

export default app;
