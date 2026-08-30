import { useState, useEffect, useCallback } from 'react';
import { websocketService, ConnectionState, WebSocketListener } from '../services/websocket';

export const useWebSocket = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(websocketService.getState());

  useEffect(() => {
    websocketService.connect();
    const unsub = websocketService.onStateChange((state) => {
      setConnectionState(state);
    });

    return () => {
      unsub();
    };
  }, []);

  const subscribe = useCallback((eventType: string, handler: WebSocketListener) => {
    return websocketService.subscribe(eventType, handler);
  }, []);

  const subscribeChannel = useCallback((channel: string) => {
    websocketService.subscribeChannel(channel);
  }, []);

  const unsubscribeChannel = useCallback((channel: string) => {
    websocketService.unsubscribeChannel(channel);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === 'CONNECTED',
    subscribe,
    subscribeChannel,
    unsubscribeChannel
  };
};

export const useRealtime = useWebSocket;
