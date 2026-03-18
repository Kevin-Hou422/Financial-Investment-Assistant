"""
Live FX rate fetcher with 1-hour in-memory cache.
Source: open.er-api.com (free, no API key required).
Falls back to hardcoded approximations if the network call fails.
"""
import logging
import time
from typing import Dict

import httpx

log = logging.getLogger(__name__)

_FALLBACK: Dict[str, float] = {
    "USD": 1.0, "HKD": 0.1282, "CNY": 0.1380,
    "EUR": 1.08, "GBP": 1.27, "JPY": 0.0067,
    "AUD": 0.64, "CAD": 0.73, "CHF": 1.12,
}

_cache: Dict = {"rates": dict(_FALLBACK), "ts": 0.0, "source": "fallback"}
_TTL = 3600.0  # 1 hour


def get_fx_rates() -> Dict[str, float]:
    """
    Return {currency_code: rate_to_usd}.
    Fetches fresh data at most once per hour; otherwise serves the cache.
    """
    if time.time() - _cache["ts"] < _TTL:
        return _cache["rates"]
    try:
        resp = httpx.get(
            "https://open.er-api.com/v6/latest/USD",
            timeout=6.0,
            follow_redirects=True,
        )
        if resp.status_code == 200:
            data = resp.json()
            raw: Dict[str, float] = data.get("rates", {})
            if raw:
                # API returns 1 USD = X foreign  →  invert to get X → USD
                rates = {
                    code: round(1.0 / rate, 8)
                    for code, rate in raw.items()
                    if isinstance(rate, (int, float)) and rate > 0
                }
                rates["USD"] = 1.0
                _cache.update({"rates": rates, "ts": time.time(), "source": "live"})
                log.info("FX rates refreshed (%d currencies)", len(rates))
                return rates
    except Exception as exc:
        log.warning("FX rate fetch failed (%s); using cached/fallback", exc)

    # On failure retry in 5 min instead of immediately
    if _cache["ts"] == 0.0:
        _cache["ts"] = time.time() - _TTL + 300
    return _cache["rates"]


def get_rate_to_usd(currency: str) -> float:
    """Return the to-USD rate for a single currency code."""
    return get_fx_rates().get(currency.upper(), 1.0)


def get_cache_info() -> Dict:
    return {
        "source": _cache["source"],
        "cached_at": _cache["ts"],
        "currency_count": len(_cache["rates"]),
        "age_s": round(time.time() - _cache["ts"], 1),
        "ttl_s": _TTL,
    }
