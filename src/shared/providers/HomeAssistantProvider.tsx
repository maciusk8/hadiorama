import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import type { EntityState, HomeAssistantContextType, HomeAssistantProviderProps } from '@/shared/types/communication';

export const HAContext = React.createContext<HomeAssistantContextType | null>(null);


export const HomeAssistantProvider: React.FC<HomeAssistantProviderProps> = ({ url, children }) => {
    const [entities, setEntities] = useState<EntityState[]>([]);
    const subscribedRef = useRef(false);
    const messageId = useRef(1);

    const sendCommandRef = useRef<(message: object) => void>(() => { });

    const handleMessage = useCallback((message: any) => {
        if (message.type === 'result' && message.success && Array.isArray(message.result)) {
            setEntities(message.result);

            if (!subscribedRef.current) {
                sendCommandRef.current({ type: 'subscribe_events', event_type: 'state_changed' });
                subscribedRef.current = true;
            }
        } else if (message.type === 'event' && message.event.event_type === 'state_changed') {
            const newState = message.event.data.new_state;

            setEntities(prev => prev.map(entity =>
                entity.entity_id === newState.entity_id ? newState : entity
            ));
        }
    }, []);

    const { status, lastMessage, sendMessage, error, reconnect } = useAuth(url, { onMessage: handleMessage });

    const sendCommand = useCallback((message: object) => {
        sendMessage({
            id: messageId.current++,
            ...message
        });
    }, [sendMessage]);

    sendCommandRef.current = sendCommand;

    useEffect(() => {
        if (status === 'authenticated') {
            sendCommand({ type: 'get_states' });
        } else {
            subscribedRef.current = false;
        }
    }, [status, sendCommand]);

    const contextValue = useMemo<HomeAssistantContextType>(() => ({
        status,
        entities,
        lastMessage,
        sendCommand,
        error,
        reconnect
    }), [status, entities, lastMessage, sendCommand, error, reconnect]);

    return (
        <HAContext.Provider value={contextValue}>
            {children}
        </HAContext.Provider>
    );
};