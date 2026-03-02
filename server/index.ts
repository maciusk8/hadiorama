import { Elysia } from 'elysia';
import path from 'node:path';
import { exists } from 'node:fs/promises';

import { roomsRoutes } from './routes/rooms';
import { pinsRoutes } from './routes/pins';
import { lightsRoutes } from './routes/lights';
import { areasRoutes } from './routes/areas';
import { pinTypesRoutes } from './routes/pinTypes';
import { uploadsRoutes } from './routes/uploads';

const DIST_DIR = path.resolve(import.meta.dir, '../dist');

const app = new Elysia()
  .use(uploadsRoutes)
  .group('/api/local', (api) => api
    .use(roomsRoutes)
    .use(pinsRoutes)
    .use(lightsRoutes)
    .use(areasRoutes)
    .use(pinTypesRoutes)
  )
  // Serve static frontend files in production
  .get('/assets/*', async ({ params, set }) => {
    const filePath = path.join(DIST_DIR, 'assets', params['*']);
    if (await exists(filePath)) return Bun.file(filePath);
    set.status = 404;
    return 'Not found';
  })
  .get('/*', async ({ params, set }) => {
    const requestedPath = params['*'] || '';

    // Skip API and upload routes
    if (requestedPath.startsWith('api/') || requestedPath.startsWith('uploads/')) return;

    // Try to serve the exact file first
    const filePath = path.join(DIST_DIR, requestedPath);
    if (requestedPath && await exists(filePath)) return Bun.file(filePath);

    // Fallback to index.html for SPA client-side routing
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (await exists(indexPath)) return Bun.file(indexPath);

    set.status = 404;
    return 'Not found';
  })
  .listen(3000);

console.log(`Elysia backend server running on port ${app.server?.port}`);