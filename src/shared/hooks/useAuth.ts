import { useWebSocket } from '@/shared/hooks/useWebSocket';
import { useState, useEffect } from 'react';
import type { HAConnectionStatus } from '@/shared/types/protocol';

/**
 * Handles the WebSocket connection lifecycle with the proxy.
 *
 * Since the Elysia proxy handles HA authentication server-side,
 * this hook no longer sends auth messages. It waits for the proxy
 * to forward `auth_ok` from HA, indicating the connection is ready.
 */
export function useAuth(url: string, options: { onMessage: (message: Record<string, any>) => void }) {
    const { connectionStatus, lastMessage, error, sendMessage, reconnect } = useWebSocket(url, options);
    const [status, setStatus] = useState<HAConnectionStatus>('disconnected');

    useEffect(() => {
        if (connectionStatus === 'connecting') {
            setStatus('connecting');
        } else if (connectionStatus === 'connected') {
            // Proxy is handling auth with HA — we're waiting for auth_ok
            setStatus('authenticating');
        } else if (connectionStatus === 'disconnected') {
            setStatus('disconnected');
        }
    }, [connectionStatus]);

    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'auth_ok') {
            setStatus('authenticated');
        } else if (lastMessage.type === 'auth_failed') {
            setStatus('auth_failed');
            console.error('Proxy authentication failed:', lastMessage.message);
        }
    }, [lastMessage]);

    return {
        status,
        lastMessage,
        error,
        sendMessage,
        reconnect
    };
}
