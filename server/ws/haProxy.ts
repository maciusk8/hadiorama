/**
 * WebSocket proxy between the browser client and Home Assistant.
 *
 * Architecture:
 *   Browser  ←→  Elysia WS (/ws/ha)  ←→  HA WS (/api/websocket)
 *
 * The proxy:
 * 1. Accepts a WS connection from the browser
 * 2. Opens a WS connection to HA
 * 3. Handles the HA auth phase server-side (token never reaches the browser)
 * 4. Sends a synthetic "auth_ok" to the browser when HA auth succeeds
 * 5. After auth: relays all messages bidirectionally (transparent proxy)
 *
 * Token refresh is handled by tokenService.ensureValidToken() before
 * sending the auth message to HA.
 */

import { Elysia } from 'elysia';
import { AUTH_CONFIG } from '../auth/config';
import { isAuthenticated, getSessionId } from '../auth/sessionStore';
import { ensureValidToken } from '../auth/tokenService';

/**
 * Tracks the upstream HA WebSocket connection paired with each client.
 * Using a WeakMap keyed by the underlying Bun socket (ws.raw) because Elysia's 
 * wrapper `ws` object is recreated between events and loses mutated properties.
 */
const upstreamConnections = new WeakMap<object, WebSocket>();

export const haProxyWs = new Elysia()
  .ws('/ws/ha', {
    /**
     * Called when a browser client connects.
     * Opens a paired connection to HA and handles the auth handshake.
     */
    open(ws) {
      const isAuth = isAuthenticated();
      const sessionId = getSessionId();
      
      // Attempt to read the cookie from ws.data or headers (Elysia parsing vs raw Bun request)
      const dataCookie = (ws.data as any)?.cookie?.auth_session?.value;
      const rawCookieStr = (ws as any).raw?.headers?.cookie || '';
      const rawCookieMatch = rawCookieStr.match(/(?:^|;\s*)auth_session=([^;]*)/);
      const authSessionCookie = dataCookie || (rawCookieMatch ? rawCookieMatch[1] : null);

      const hasValidCookie = authSessionCookie && authSessionCookie === sessionId;

      if (!isAuth || !hasValidCookie) {
        ws.send(JSON.stringify({ type: 'auth_failed', message: 'Not authenticated. Please log in.' }));
        ws.close();
        return;
      }

      const rawKey = (ws as any).raw || ws;
      
      const haWs = new WebSocket(AUTH_CONFIG.haWsUrl);
      upstreamConnections.set(rawKey, haWs);

      let haAuthenticated = false;

      haWs.onmessage = (event: MessageEvent) => {
        const data = String(event.data);

        try {
          const message = JSON.parse(data);

          // Handle HA auth phase server-side — client never sees auth_required
          if (message.type === 'auth_required') {
            ensureValidToken()
              .then((token) => {
                haWs.send(JSON.stringify({ type: 'auth', access_token: token }));
              })
              .catch((error) => {
                console.error('[WS Proxy] Failed to get valid token:', error);
                ws.send(JSON.stringify({ type: 'auth_failed', message: 'Token refresh failed' }));
                ws.close();
              });
            return;
          }

          if (message.type === 'auth_ok') {
            haAuthenticated = true;
            // Forward auth_ok to client so it knows the connection is ready
            ws.send(data);
            return;
          }

          if (message.type === 'auth_invalid') {
            console.error('[WS Proxy] HA rejected authentication:', message.message);
            ws.send(JSON.stringify({ type: 'auth_failed', message: message.message }));
            ws.close();
            return;
          }

          // After auth: transparent relay HA → client
          if (haAuthenticated) {
            ws.send(data);
          }
        } catch {
          // Non-JSON message from HA (shouldn't happen) — relay as-is
          if (haAuthenticated) {
            ws.send(data);
          }
        }
      };

      haWs.onerror = (error) => {
        console.error('[WS Proxy] HA upstream error:', error);
      };

      haWs.onclose = () => {
        upstreamConnections.delete(rawKey);
        ws.close();
      };
    },

    /**
     * Relay client → HA messages.
     * Only forwards after the HA auth handshake is complete.
     */
    message(ws, message) {
      const rawKey = (ws as any).raw || ws;
      const haWs = upstreamConnections.get(rawKey);

      if (!haWs || haWs.readyState !== WebSocket.OPEN) {
        console.warn(`[WS Proxy] No upstream connection available for message relay`);
        return;
      }

      haWs.send(typeof message === 'string' ? message : JSON.stringify(message));
    },

    /**
     * Clean up the upstream connection when the client disconnects.
     */
    close(ws) {
      const rawKey = (ws as any).raw || ws;
      const haWs = upstreamConnections.get(rawKey);

      if (haWs) {
        haWs.close();
        upstreamConnections.delete(rawKey);
      }
    },
  });
