/**
 * In-memory session store for a single-user HA dashboard.
 *
 * Stores OAuth tokens server-side — the browser never sees them.
 * Restart of the server = user must re-authenticate via OAuth.
 */

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Absolute timestamp (ms) when the access token expires */
  expiresAt: number;
  /** Unique ID for the browser cookie to map to this session */
  sessionId: string;
  /** Dynamic client ID used to negotiate this session token */
  clientId: string;
}

/** Buffer before actual expiry to trigger proactive refresh (5 minutes) */
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

let currentSession: OAuthTokens | null = null;

export function getSession(): OAuthTokens | null {
  return currentSession;
}

export function getSessionId(): string | null {
  return currentSession?.sessionId || null;
}

export function setSession(tokens: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  client_id: string;
}): void {
  currentSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    sessionId: crypto.randomUUID(),
    clientId: tokens.client_id,
  };
}

export function updateAccessToken(tokens: {
  access_token: string;
  expires_in: number;
}): void {
  if (!currentSession) {
    throw new Error('Cannot update access token: no active session');
  }
  currentSession = {
    ...currentSession,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

export function clearSession(): void {
  currentSession = null;
}

export function isAuthenticated(): boolean {
  return currentSession !== null;
}

export function isTokenExpired(): boolean {
  if (!currentSession) return true;
  return Date.now() >= currentSession.expiresAt - EXPIRY_BUFFER_MS;
}
