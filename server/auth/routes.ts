/**
 * OAuth route handlers for Home Assistant authorization.
 *
 * Exposes endpoints for the OAuth2 authorization code flow:
 * - GET  /auth/login    → redirect to HA authorize page
 * - GET  /auth/callback → exchange code for tokens, redirect to app
 * - GET  /auth/status   → check if user is authenticated
 * - POST /auth/logout   → revoke tokens, clear session
 *
 * @see https://developers.home-assistant.io/docs/auth_api
 */

import { Elysia } from 'elysia';
import { AUTH_CONFIG } from './config';
import { isAuthenticated, getSessionId } from './sessionStore';
import { exchangeCodeForTokens, revokeToken } from './tokenService';

export const authRoutes = new Elysia({ prefix: '/auth' })

  /**
   * Initiates the OAuth flow by redirecting the user to HA's authorize page.
   * HA will prompt for login and consent, then redirect back to /auth/callback.
   */
  .get('/login', ({ request, redirect }) => {
    // Construct dynamic clientId from the request
    const url = new URL(request.url);
    const host = request.headers.get('x-forwarded-host') || url.host;
    const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    const clientId = `${proto}://${host}`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: AUTH_CONFIG.getRedirectUri(clientId),
    });

    return redirect(`${AUTH_CONFIG.authorizeUrl}?${params.toString()}`);
  })

  /**
   * OAuth callback — HA redirects here with ?code=... after user authorizes.
   * Exchanges the code for access + refresh tokens and redirects to the app.
   */
  .get('/callback', async ({ request, query, redirect, set, cookie: { auth_session } }) => {
    const { code } = query;

    if (!code) {
      set.status = 400;
      return { error: 'Missing authorization code' };
    }

    try {
      const url = new URL(request.url);
      const host = request.headers.get('x-forwarded-host') || url.host;
      const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
      const clientId = `${proto}://${host}`;

      await exchangeCodeForTokens(code as string, clientId);
      
      const sessionId = getSessionId();
      if (sessionId) {
        auth_session.set({
          value: sessionId,
          httpOnly: true,
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 roku zabezpieczająco
        });
      }

      return redirect('/');
    } catch (error) {
      console.error('[Auth] Callback error:', error);
      set.status = 500;
      return { error: 'Authorization failed. Please try again.' };
    }
  })

  /**
   * Returns the current authentication status.
   * Used by the frontend to decide whether to show the app or redirect to login.
   */
  .get('/status', ({ cookie: { auth_session } }) => {
    const isAuth = isAuthenticated();
    const sessionId = getSessionId();
    const hasValidCookie = auth_session.value && auth_session.value === sessionId;
    
    return { authenticated: isAuth && hasValidCookie };
  })

  /**
   * Revokes the refresh token and clears the server-side session.
   */
  .post('/logout', async ({ cookie: { auth_session } }) => {
    await revokeToken();
    auth_session.remove();
    return { success: true };
  });
