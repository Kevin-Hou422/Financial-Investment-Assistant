/**
 * useMarketWebSocket — connects to WS /api/ws/prices, streams major market tickers.
 * Auto-reconnects with exponential backoff up to 30 s.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000];

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

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/api/ws/prices?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
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
