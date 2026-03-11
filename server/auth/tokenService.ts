/**
 * Token exchange and refresh service for HA OAuth2.
 *
 * All communication with HA's /auth/token endpoint happens here.
 * Uses application/x-www-form-urlencoded as required by HA.
 *
 * @see https://developers.home-assistant.io/docs/auth_api#token
 */

import { AUTH_CONFIG } from './config';
import {
  getSession,
  setSession,
  updateAccessToken,
  clearSession,
  isTokenExpired,
} from './sessionStore';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenError {
  error: string;
  error_description: string;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * Called once after the user completes the OAuth authorize step.
 */
export async function exchangeCodeForTokens(code: string): Promise<void> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: AUTH_CONFIG.clientId,
  });

  const response = await fetch(AUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = (await response.json()) as TokenError;
    throw new Error(`Token exchange failed: ${error.error_description ?? error.error}`);
  }

  const tokens = (await response.json()) as TokenResponse;
  setSession(tokens);

  console.log('[Auth] Successfully exchanged code for tokens');
}

/**
 * Refresh the access token using the stored refresh token.
 * Called automatically when the access token is near expiry.
 */
export async function refreshAccessToken(): Promise<void> {
  const session = getSession();
  if (!session) {
    throw new Error('Cannot refresh: no active session');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: AUTH_CONFIG.clientId,
  });

  const response = await fetch(AUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = (await response.json()) as TokenError;
    console.error('[Auth] Token refresh failed:', error.error_description);
    clearSession();
    throw new Error(`Token refresh failed: ${error.error_description ?? error.error}`);
  }

  const tokens = (await response.json()) as RefreshResponse;
  updateAccessToken(tokens);

  console.log('[Auth] Access token refreshed successfully');
}

/**
 * Ensure a valid (non-expired) access token is available.
 * Refreshes transparently if needed.
 *
 * @returns The current valid access token
 * @throws If no session exists or refresh fails
 */
export async function ensureValidToken(): Promise<string> {
  const session = getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  if (isTokenExpired()) {
    await refreshAccessToken();
  }

  return getSession()!.accessToken;
}

/**
 * Revoke the current refresh token and clear the session.
 */
export async function revokeToken(): Promise<void> {
  const session = getSession();
  if (!session) return;

  const body = new URLSearchParams({
    token: session.refreshToken,
    action: 'revoke',
  });

  // HA always returns 200 for revoke, regardless of outcome
  await fetch(AUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  clearSession();
  console.log('[Auth] Token revoked, session cleared');
}
