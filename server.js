import { serve } from '@hono/node-server';
import app from './backend/hono.ts';

const port = process.env.PORT || 3000;

console.log('[Server] Starting server on port', port);

serve({
  fetch: app.fetch,
  port: Number(port),
});

console.log(`[Server] Server running at http://localhost:${port}`);
