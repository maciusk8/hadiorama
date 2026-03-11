import { Elysia } from 'elysia';
import path from 'node:path';
import { exists } from 'node:fs/promises';

import { authRoutes } from './auth/routes';
import { haProxyWs } from './ws/haProxy';
import { isAuthenticated, getSessionId } from './auth/sessionStore';

import { roomsRoutes } from './routes/rooms';
import { pinsRoutes } from './routes/pins';
import { lightsRoutes } from './routes/lights';
import { areasRoutes } from './routes/areas';
import { pinTypesRoutes } from './routes/pinTypes';
import { uploadsRoutes } from './routes/uploads';

const DIST_DIR = path.resolve(import.meta.dir, '../dist');

const app = new Elysia()
  // Auth routes (no session guard — these ARE the auth mechanism)
  .use(authRoutes)

  // WebSocket proxy to HA (session check is inside the handler)
  .use(haProxyWs)

  // Uploads (public — images need to load regardless)
  .use(uploadsRoutes)

  // Local API routes — protected by session guard
  .group('/api/local', (api) => api
    .onBeforeHandle(({ set, cookie: { auth_session } }) => {
      const isAuth = isAuthenticated();
      const sessionId = getSessionId();
      const hasValidCookie = auth_session.value && auth_session.value === sessionId;

      if (!isAuth || !hasValidCookie) {
        set.status = 401;
        return { error: 'Not authenticated' };
      }
    })
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

    // Skip API, auth, upload, and ws routes
    if (
      requestedPath.startsWith('api/') ||
      requestedPath.startsWith('auth/') ||
      requestedPath.startsWith('uploads/') ||
      requestedPath.startsWith('ws/')
    ) return;

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