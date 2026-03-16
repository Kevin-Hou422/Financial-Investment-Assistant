"""
agent_market_interface — market snapshot for agents.

Supports two calling modes:
  • New (SQLAlchemy): get_market_snapshot(db, user_id)  — per-user assets
  • Legacy (JSON):    get_market_snapshot()             — reads assets.json
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session


def _looks_like_symbol(value: str) -> bool:
    if not value:
        return False
    value = value.strip()
    if len(value) > 20:
        return False
    allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.^-=/_")
    return all(ch in allowed for ch in value)


def _fetch_quote(symbol: str, asset_type: str, exchange: str = "") -> Dict[str, Any]:
    from app.external.stock_api  import fetch_stock_price
    from app.external.fund_api   import fetch_fund_price
    from app.external.crypto_api import fetch_crypto_price
    from app.external.gold_api   import fetch_gold_price

    t = asset_type.lower()
    if t == "stock":
        return fetch_stock_price(symbol, asset_type="stock", exchange=exchange or None)
    if t == "fund":
        return fetch_fund_price(symbol)
    if t == "crypto":
        return fetch_crypto_price(symbol)
    if t == "gold":
        return fetch_gold_price(symbol)
    return fetch_stock_price(symbol, asset_type="stock")


def _build_snapshot(assets: List[Dict]) -> Dict[str, Any]:
    seen: set = set()
    quotes: List[Dict[str, Any]] = []
    for a in assets:
        symbol    = a.get("name")
        atype     = a.get("type", "Stock")
        exchange  = (a.get("exchange") or "").strip()
        if not symbol or not _looks_like_symbol(str(symbol)):
            continue
        key = (symbol, atype, exchange)
        if key in seen:
            continue
        seen.add(key)
        try:
            quotes.append(_fetch_quote(symbol, atype, exchange))
        except Exception:
            pass
    return {"as_of": datetime.now(timezone.utc).isoformat(), "quotes": quotes}


def get_market_snapshot(
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Returns a market snapshot for all assets held by the user."""
    if db is not None and user_id:
        from app.db.asset_repo import list_assets
        assets = list_assets(db, user_id)
    else:
        try:
            from app.db.database import load_assets
            assets = load_assets()
        except Exception:
            assets = []
    return _build_snapshot(assets)
