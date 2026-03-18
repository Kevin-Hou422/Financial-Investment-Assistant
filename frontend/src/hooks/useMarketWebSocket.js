/**
 * useMarketWebSocket — connects to WS /api/ws/prices, streams major market tickers.
 * Auto-reconnects with exponential backoff up to 30 s.
 *
 * WebSocket URL strategy:
 *  - Development (Vite):  connect directly to backend port 8000 to avoid
 *    conflicting with Vite's own HMR WebSocket client.
 *  - Production:          use window.location.host (assumed behind a reverse proxy
 *    that handles WS upgrade for /api/ws/* paths).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

function buildWsUrl(token) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // In Vite dev mode, bypass the HTTP proxy and connect directly to the backend.
  // This prevents Vite's HMR client from receiving our WS upgrade request.
  const host = import.meta.env.DEV ? 'localhost:8000' : window.location.host;
  return `${proto}//${host}/api/ws/prices?token=${encodeURIComponent(token)}`;
}

export function useMarketWebSocket() {
  const [tickerData, setTickerData] = useState([]);
  const [connected, setConnected]   = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef    = useRef(null);
  const retryRef = useRef(0);
  const timerRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('ai_invest_token');
    if (!token) return;

    const url = buildWsUrl(token);
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      retryRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'ticker' && Array.isArray(msg.data)) {
          setTickerData(msg.data);
          setLastUpdate(new Date());
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      const delay = RECONNECT_DELAYS[Math.min(retryRef.current, RECONNECT_DELAYS.length - 1)];
      retryRef.current += 1;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { tickerData, connected, lastUpdate };
}
