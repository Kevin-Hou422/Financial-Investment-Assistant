"""
WebSocket endpoint for real-time market price streaming.

  WS /api/ws/prices?token=<jwt>

Frames sent to client:
  {"type": "connected", "message": "...", "interval_s": 15}
  {"type": "ticker",    "data": [{label, symbol, price, change_pct, currency}, ...], "ts": float}
  {"type": "ping",      "ts": float}
"""
import asyncio
import logging
import os
import time
from typing import Optional

import yfinance as yf
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

log = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

_TICKER_INTERVAL = 15  # seconds between price pushes
_PING_INTERVAL = 45    # seconds between keepalive pings

_WATCH_SYMBOLS = [
    {"symbol": "^GSPC",   "label": "S&P 500",   "currency": "USD"},
    {"symbol": "^IXIC",   "label": "NASDAQ",    "currency": "USD"},
    {"symbol": "^DJI",    "label": "Dow Jones", "currency": "USD"},
    {"symbol": "^HSI",    "label": "Hang Seng", "currency": "HKD"},
    {"symbol": "BTC-USD", "label": "Bitcoin",   "currency": "USD"},
    {"symbol": "ETH-USD", "label": "Ethereum",  "currency": "USD"},
    {"symbol": "GC=F",    "label": "Gold",      "currency": "USD"},
    {"symbol": "DX-Y.NYB","label": "USD Index", "currency": "USD"},
]


def _decode_ws_token(token: str) -> Optional[str]:
    try:
        secret = os.getenv("JWT_SECRET", "")
        algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        payload = jwt.decode(token, secret, algorithms=[algorithm])
        return payload.get("sub") or payload.get("user_id")
    except JWTError:
        return None


def _fetch_tickers() -> list:
    results = []
    try:
        syms = " ".join(s["symbol"] for s in _WATCH_SYMBOLS)
        tickers = yf.Tickers(syms)
        for item in _WATCH_SYMBOLS:
            try:
                fi = tickers.tickers[item["symbol"]].fast_info
                price = float(fi.last_price or 0)
                prev = float(fi.previous_close or price)
                pct = round(((price - prev) / prev * 100) if prev else 0.0, 2)
                results.append({
                    "symbol": item["symbol"],
                    "label": item["label"],
                    "price": round(price, 4),
                    "change_pct": pct,
                    "currency": item["currency"],
                })
            except Exception:
                pass
    except Exception as exc:
        log.warning("Ticker fetch error: %s", exc)
    return results


@router.websocket("/api/ws/prices")
async def ws_prices(websocket: WebSocket, token: Optional[str] = None):
    """
    Authenticate via ?token=<jwt>, then push ticker updates every 15 s.
    """
    user_id = _decode_ws_token(token) if token else None
    if not user_id:
        await websocket.close(code=4001)
        return

    await websocket.accept()
    log.info("WS prices connected: user=%s", user_id)

    # Initial fetch + send
    initial = await asyncio.to_thread(_fetch_tickers)
    try:
        await websocket.send_json({
            "type": "connected",
            "message": "Real-time market stream active",
            "interval_s": _TICKER_INTERVAL,
        })
        if initial:
            await websocket.send_json({"type": "ticker", "data": initial, "ts": time.time()})
    except Exception:
        return

    last_ticker = time.time()
    last_ping = time.time()

    try:
        while True:
            await asyncio.sleep(1)
            now = time.time()

            if now - last_ticker >= _TICKER_INTERVAL:
                data = await asyncio.to_thread(_fetch_tickers)
                await websocket.send_json({"type": "ticker", "data": data, "ts": now})
                last_ticker = now

            if now - last_ping >= _PING_INTERVAL:
                await websocket.send_json({"type": "ping", "ts": now})
                last_ping = now

    except (WebSocketDisconnect, Exception) as exc:
        log.info("WS prices disconnected: user=%s (%s)", user_id, type(exc).__name__)
