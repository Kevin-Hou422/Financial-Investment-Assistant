from datetime import datetime, timezone
from typing import Any, Dict, Optional

import yfinance as yf

from app.utils import price_cache

_PORTFOLIO_TTL = price_cache.PORTFOLIO_TTL  # 3 minutes


def build_yf_symbol(symbol: str, exchange: Optional[str] = None) -> str:
    """
    Build yfinance ticker from symbol + exchange.
    - US: AAPL (as-is)
    - HK: 700 or 0700 -> 0700.HK
    - AShare: 600519 -> 600519.SS (Shanghai), 000001 -> 000001.SZ (Shenzhen)
    """
    symbol = (symbol or "").strip()
    if not symbol:
        return symbol
    exchange = (exchange or "").strip()
    if exchange == "US" or not exchange:
        return symbol
    if exchange == "HK":
        base = symbol.split(".")[0]
        if base.isdigit():
            base = base.zfill(4)
        return f"{base}.HK"
    if exchange == "AShare":
        base = symbol.split(".")[0]
        if not base.isdigit():
            return f"{symbol}.SS"
        if base.startswith("6"):
            return f"{base}.SS"
        return f"{base}.SZ"
    return symbol


def _safe_change_pct(price: float | None, previous_close: float | None) -> float | None:
    if price is None or previous_close in (None, 0):
        return None
    return (price - previous_close) / previous_close * 100


def fetch_stock_price(
    symbol: str,
    asset_type: str = "stock",
    exchange: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch stock/ETF/fund price via yfinance with server-wide price cache.

    Cache behaviour:
      - Returns cached data (up to 3 minutes old) without hitting yfinance.
      - On yfinance failure returns the last known cached price rather than null,
        preventing portfolio total gaps due to transient API errors.

    Returns a dict with keys:
      symbol, asset_type, exchange, price, previous_close, change_pct,
      timestamp, error, cached (bool).
    """
    yf_symbol = build_yf_symbol(symbol, exchange)
    cache_key = yf_symbol.upper()

    # ── 1. Serve from cache if fresh ──────────────────────────────────────────
    cached = price_cache.get(cache_key, ttl=_PORTFOLIO_TTL)
    if cached:
        return {
            "symbol":         yf_symbol,
            "asset_type":     asset_type,
            "exchange":       exchange,
            "price":          cached["price"],
            "previous_close": None,
            "change_pct":     cached["change_pct"],
            "timestamp":      datetime.now(timezone.utc).isoformat(),
            "error":          None,
            "cached":         True,
        }

    # ── 2. Fetch from yfinance (with 2 retries) ───────────────────────────────
    import time
    last_exc = None
    for attempt in range(3):
        try:
            ticker = yf.Ticker(yf_symbol)
            data   = ticker.fast_info

            last_price     = float(getattr(data, "last_price", 0.0) or 0.0)
            previous_close = getattr(data, "previous_close", None)
            previous_close = float(previous_close) if previous_close not in (None, 0) else None
            change_pct     = _safe_change_pct(last_price, previous_close)

            if last_price:
                price_cache.put(cache_key, last_price, change_pct or 0.0)

            return {
                "symbol":         yf_symbol,
                "asset_type":     asset_type,
                "exchange":       exchange,
                "price":          last_price or None,
                "previous_close": previous_close,
                "change_pct":     change_pct,
                "timestamp":      datetime.now(timezone.utc).isoformat(),
                "error":          None,
                "cached":         False,
            }
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                time.sleep(0.4 * (attempt + 1))

    # ── 3. Fall back to last known cached value ───────────────────────────────
    stale = price_cache.get_last_known(cache_key)
    return {
        "symbol":         yf_symbol,
        "asset_type":     asset_type,
        "exchange":       exchange,
        "price":          stale["price"] if stale else None,
        "previous_close": None,
        "change_pct":     stale["change_pct"] if stale else None,
        "timestamp":      datetime.now(timezone.utc).isoformat(),
        "error":          str(last_exc),
        "cached":         bool(stale),
    }
