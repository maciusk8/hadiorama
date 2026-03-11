/**
 * OAuth configuration for Home Assistant authorization.
 *
 * HA uses an IndieAuth-inspired OAuth2 flow where:
 * - client_id = URL of the application
 * - redirect_uri must share the same host/port as client_id
 *
 * @see https://developers.home-assistant.io/docs/auth_api
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

export const AUTH_CONFIG = {
  /** Base URL of the Home Assistant instance (e.g. http://192.168.1.75:8123) */
  get haUrl(): string {
    return stripTrailingSlash(requireEnv('HA_URL'));
  },

  /** HA WebSocket URL derived from haUrl */
  get haWsUrl(): string {
    return this.haUrl.replace(/^http/, 'ws') + '/api/websocket';
  },

  /** OAuth authorize endpoint */
  get authorizeUrl(): string {
    return `${this.haUrl}/auth/authorize`;
  },

  /** OAuth token endpoint */
  get tokenUrl(): string {
    return `${this.haUrl}/auth/token`;
  },

  /** Helper to construct the redirect_uri from a dynamically determined client_id */
  getRedirectUri(clientId: string): string {
    return `${stripTrailingSlash(clientId)}/auth/callback`;
  },
} as const;
