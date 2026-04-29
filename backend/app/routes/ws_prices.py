"""
WebSocket endpoint for real-time market price streaming.

  WS /api/ws/prices?token=<jwt>

Frames sent to client:
  {"type": "connected", "message": "...", "interval_s": 15}
  {"type": "ticker",    "data": [{label, symbol, price, change_pct, currency}, ...], "ts": float}
  {"type": "ping",      "ts": float}

Reliability features:
  - Server-wide price_cache with 12-second TTL: only stale symbols trigger
    yfinance calls, preventing burst rate-limit hits when many clients connect.
  - Per-symbol individual fetch (more reliable than yf.Tickers bulk call).
  - Up to 3 retries with linear backoff per symbol.
  - Last-known-value fallback: if yfinance is temporarily unavailable for a
    symbol, the most recent cached value is returned instead of dropping it.
"""
import asyncio
import logging
import os
import time
from typing import Optional

import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.utils import price_cache

log = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

_TICKER_INTERVAL = 15   # seconds between price pushes to clients
_PING_INTERVAL   = 45   # seconds between keepalive pings
_FETCH_RETRIES   = 2    # per-symbol retry attempts
_FETCH_BACKOFF   = 0.4  # base backoff in seconds (multiplied by attempt number)

_WATCH_SYMBOLS = [
    {"symbol": "^GSPC",    "label": "S&P 500",   "currency": "USD"},
    {"symbol": "^IXIC",    "label": "NASDAQ",    "currency": "USD"},
    {"symbol": "^DJI",     "label": "Dow Jones", "currency": "USD"},
    {"symbol": "^HSI",     "label": "Hang Seng", "currency": "HKD"},
    {"symbol": "BTC-USD",  "label": "Bitcoin",   "currency": "USD"},
    {"symbol": "ETH-USD",  "label": "Ethereum",  "currency": "USD"},
    {"symbol": "GC=F",     "label": "Gold",      "currency": "USD"},
    {"symbol": "DX-Y.NYB", "label": "USD Index", "currency": "USD"},
]


# ── Auth helper ────────────────────────────────────────────────────────────────

def _decode_ws_token(token: str) -> Optional[str]:
    try:
        secret    = os.getenv("JWT_SECRET", "")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        payload   = jwt.decode(token, secret, algorithms=[algorithm])
        return payload.get("sub") or payload.get("user_id")
    except JWTError:
        return None


# ── Price fetching with cache + retry ─────────────────────────────────────────

def _fetch_one(symbol: str) -> Optional[dict]:
    """
    Fetch a single symbol from yfinance with retry + backoff.
    Returns {price, change_pct} or None on complete failure.
    """
    for attempt in range(_FETCH_RETRIES + 1):
        try:
            fi    = yf.Ticker(symbol).fast_info
            price = float(fi.last_price or 0)
            prev  = float(fi.previous_close or price)
            pct   = round(((price - prev) / prev * 100) if prev else 0.0, 2)
            return {"price": price, "change_pct": pct}
        except Exception as exc:
            if attempt < _FETCH_RETRIES:
                time.sleep(_FETCH_BACKOFF * (attempt + 1))
            else:
                log.debug("yfinance fetch failed for %s after %d tries: %s",
                          symbol, _FETCH_RETRIES + 1, exc)
    return None


def _build_ticker_payload() -> list:
    """
    Build the ticker list served to WS clients.

    Strategy:
      1. Symbols with a fresh cache entry (< 12 s) → served directly (0 API calls).
      2. Stale symbols → fetched individually with retry, result stored in cache.
      3. If fetch fails → last known cached value used as fallback.
      4. Symbols with no data at all → omitted from payload.
    """
    stale = [
        item for item in _WATCH_SYMBOLS
        if not price_cache.get(item["symbol"])
    ]

    for item in stale:
        result = _fetch_one(item["symbol"])
        if result:
            price_cache.put(item["symbol"], result["price"], result["change_pct"])

    payload = []
    for item in _WATCH_SYMBOLS:
        entry = (
            price_cache.get(item["symbol"]) or
            price_cache.get_last_known(item["symbol"])
        )
        if entry:
            payload.append({
                "symbol":     item["symbol"],
                "label":      item["label"],
                "price":      round(entry["price"], 4),
                "change_pct": entry["change_pct"],
                "currency":   item["currency"],
            })
    return payload


# ── WebSocket endpoint ─────────────────────────────────────────────────────────

@router.websocket("/api/ws/prices")
async def ws_prices(websocket: WebSocket, token: Optional[str] = None):
    """
    Authenticate via ?token=<jwt>, then stream ticker updates every 15 s.
    """
    user_id = _decode_ws_token(token) if token else None
    if not user_id:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    log.info("WS prices connected: user=%s", user_id)

    # Send initial payload immediately
    initial = await asyncio.to_thread(_build_ticker_payload)
    try:
        await websocket.send_json({
            "type":       "connected",
            "message":    "Real-time market stream active",
            "interval_s": _TICKER_INTERVAL,
        })
        if initial:
            await websocket.send_json({"type": "ticker", "data": initial, "ts": time.time()})
    except Exception:
        return

    # Track ping cadence relative to ticker fires
    ticks_per_ping = _PING_INTERVAL // _TICKER_INTERVAL  # e.g. 45 // 15 = 3
    tick_count = 0

    try:
        while True:
            # Sleep exactly one ticker interval — no 1-second polling needed
            await asyncio.sleep(_TICKER_INTERVAL)
            now = time.time()

            data = await asyncio.to_thread(_build_ticker_payload)
            await websocket.send_json({"type": "ticker", "data": data, "ts": now})

            tick_count += 1
            if tick_count >= ticks_per_ping:
                await websocket.send_json({"type": "ping", "ts": now})
                tick_count = 0

    except (WebSocketDisconnect, Exception) as exc:
        log.info("WS prices disconnected: user=%s (%s)", user_id, type(exc).__name__)
