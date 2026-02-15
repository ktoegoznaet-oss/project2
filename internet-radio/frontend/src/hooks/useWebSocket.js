'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Build WS URL from current page host at runtime — no env dependency
const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:3000/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
};

export default function useWebSocket() {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [listeners, setListeners] = useState(0);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      const token = localStorage.getItem('radio_token');
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'chat_message':
          case 'dj_message':
            setMessages((prev) => [...prev.slice(-200), data]);
            break;
          case 'now_playing':
            setNowPlaying(data);
            break;
          case 'connected':
            setListeners(data.listeners || 0);
            break;
          case 'auth_success':
            break;
          case 'order_update':
            break;
          default:
            break;
        }
      } catch (err) {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current += 1;
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_message', message }));
    }
  }, []);

  const authenticate = useCallback((token) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'auth', token }));
    }
  }, []);

  return { connected, messages, nowPlaying, listeners, sendMessage, authenticate, setMessages };
}
