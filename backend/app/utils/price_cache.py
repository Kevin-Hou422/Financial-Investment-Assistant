"""
Server-wide in-memory price cache.

Shared across WebSocket ticker streaming and portfolio calculations to prevent
yfinance burst requests and reduce rate-limit exposure.

Thread-safe: uses a reentrant lock (WS handler uses asyncio.to_thread,
so the cache may be accessed from multiple OS threads simultaneously).
"""
from __future__ import annotations

import threading
import time
from typing import Dict, Optional

_lock = threading.RLock()

# symbol -> {price, change_pct, ts}
_store: Dict[str, dict] = {}

# TTLs (seconds)
TICKER_TTL    = 12     # acceptable staleness for WS streaming (< 15 s interval)
PORTFOLIO_TTL = 180    # 3-minute cache for portfolio P&L calculations


# ── Public API ─────────────────────────────────────────────────────────────────

def get(symbol: str, ttl: float = TICKER_TTL) -> Optional[dict]:
    """Return cached entry if fresh (age < ttl), else None."""
    with _lock:
        entry = _store.get(symbol)
        if entry and time.time() - entry["ts"] < ttl:
            return entry
        return None


def get_last_known(symbol: str) -> Optional[dict]:
    """Return the most recent entry regardless of age — used as a last-resort fallback."""
    with _lock:
        return _store.get(symbol)


def put(symbol: str, price: float, change_pct: float) -> None:
    """Insert or update a symbol entry."""
    with _lock:
        _store[symbol] = {"price": price, "change_pct": change_pct, "ts": time.time()}


def invalidate(symbol: str) -> None:
    """Force a symbol to be considered stale."""
    with _lock:
        if symbol in _store:
            _store[symbol]["ts"] = 0.0


def stats() -> dict:
    with _lock:
        now = time.time()
        return {
            "total": len(_store),
            "fresh_12s": sum(1 for e in _store.values() if now - e["ts"] < 12),
            "fresh_3m":  sum(1 for e in _store.values() if now - e["ts"] < 180),
        }
