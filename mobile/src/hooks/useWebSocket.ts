import { useEffect, useRef, useCallback, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../context/authStore';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WS_BASE_URL = __DEV__
  ? 'ws://192.168.1.100:8001'
  : 'wss://api.rostracore.com';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 30000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

type MessageHandler = (message: WSMessage) => void;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebSocket(handlers?: Record<string, MessageHandler>) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>();
  const { isAuthenticated } = useAuthStore();
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = await SecureStore.getItemAsync('access_token');
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE_URL}/api/v1/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;

      // Start heartbeat
      heartbeatTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        // Skip pong messages
        if (message.type === 'pong') return;

        // Call specific handler if registered
        if (handlers?.[message.type]) {
          handlers[message.type](message);
        }

        // Call wildcard handler if registered
        if (handlers?.['*']) {
          handlers['*'](message);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      clearInterval(heartbeatTimer.current);

      // Reconnect with exponential backoff
      if (
        isAuthenticated &&
        reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
      ) {
        const delay =
          RECONNECT_DELAY_MS * Math.pow(1.5, reconnectAttempts.current);
        reconnectAttempts.current += 1;
        setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [isAuthenticated, handlers]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    }

    return () => {
      clearInterval(heartbeatTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, connect]);

  // Send a message
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { connected, send };
}
