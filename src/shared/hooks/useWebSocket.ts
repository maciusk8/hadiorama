import { useState, useEffect, useRef, useCallback } from 'react';
import type { HAConnectionStatus } from '@/shared/types/protocol';

const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1000;

export function useWebSocket(url: string, options: { onMessage: (message: Record<string, any>) => void }) {
    const [connectionStatus, setConnectionStatus] = useState<HAConnectionStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<Record<string, any> | null>(null);
    const [error, setError] = useState<string | null>(null);

    const onMessageRef = useRef(options.onMessage);

    useEffect(() => {
        onMessageRef.current = options.onMessage;
    }, [options.onMessage]);

    const ws = useRef<WebSocket | null>(null);
    const retryCount = useRef<number>(0);
    const retryTimeoutId = useRef<number | null>(null);
    const shouldReconnect = useRef<boolean>(true);
    const messageQueue = useRef<object[]>([]);

    const connect = useCallback(() => {
        // Cleanup previous connection if exists
        if (ws.current) {
            ws.current.close();
        }

        ws.current = new WebSocket(url);
        setConnectionStatus('connecting');
        setError(null);

        ws.current.onopen = () => {
            setConnectionStatus('connected');
            retryCount.current = 0; // Reset retry counter on successful connection
            
            // Flush any queued messages
            if (messageQueue.current.length > 0) {
                messageQueue.current.forEach(msg => {
                    if (ws.current?.readyState === WebSocket.OPEN) {
                        ws.current.send(JSON.stringify(msg));
                    }
                });
                messageQueue.current = [];
            }
        };

        ws.current.onmessage = (event) => {
            try {
                const message: Record<string, any> = JSON.parse(event.data);
                if (onMessageRef.current) {
                    onMessageRef.current(message);
                }
                setLastMessage(message);
            } catch (e) {
                setError("Failed to parse message: " + e);
                console.error("Failed to parse message:", e, "Raw data:", event.data);
            }
        };

        ws.current.onerror = (error) => {
            setError("WebSocket error");
            console.error('WebSocket error:', error);
        };

        ws.current.onclose = () => {
            setConnectionStatus('disconnected');

            // Only reconnect if we should and haven't exceeded max attempts
            if (shouldReconnect.current && retryCount.current < MAX_RETRY_ATTEMPTS) {
                const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount.current); // Exponential backoff

                retryTimeoutId.current = window.setTimeout(() => {
                    retryCount.current++;
                    connect();
                }, delay);
            } else if (retryCount.current >= MAX_RETRY_ATTEMPTS) {
                setError(`Failed to connect after ${MAX_RETRY_ATTEMPTS} attempts`);
            }
        };
    }, [url]);

    useEffect(() => {
        shouldReconnect.current = true;
        connect();

        return () => {
            shouldReconnect.current = false; // Prevent reconnect on cleanup
            if (retryTimeoutId.current) {
                clearTimeout(retryTimeoutId.current);
            }
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [connect]);

    const sendMessage = useCallback((message: object) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
            messageQueue.current.push(message);
        } else {
            // Let's also queue if it's disconnected, just in case reconnect happens immediately
            messageQueue.current.push(message);
        }
    }, []);

    const reconnect = () => {
        retryCount.current = 0; // Reset retry counter for manual reconnect
        connect();
    };

    return { connectionStatus, lastMessage, error, sendMessage, reconnect };
}