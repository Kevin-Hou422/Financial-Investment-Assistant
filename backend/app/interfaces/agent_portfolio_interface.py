"""
agent_portfolio_interface — structured portfolio view for agents.

Supports two calling modes:
  • New (SQLAlchemy): get_current_portfolio(db, user_id)  — multi-tenant, per-user
  • Legacy (JSON):    get_current_portfolio()              — reads assets.json
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session


def get_current_portfolio(
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns a structured portfolio view for agent consumption.

    Fields:
      assets    — raw asset list
      overview  — total cost / current value / PnL
      allocation — type & per-asset weights, concentration
    """
    if db is not None and user_id:
        return _from_sqlalchemy(db, user_id)
    return _from_json()


# ── SQLAlchemy path (new, preferred) ─────────────────────────────────────────

def _from_sqlalchemy(db: Session, user_id: str) -> Dict[str, Any]:
    from app.db.asset_repo import list_assets
    from app.utils.allocation_engine import build_allocation_metrics
    from app.utils.portfolio_engine import calculate_portfolio_overview

    assets   = list_assets(db, user_id)
    overview = calculate_portfolio_overview(assets)
    alloc    = build_allocation_metrics(assets)
    return {"assets": assets, "overview": overview, "allocation": alloc}


# ── JSON / legacy path ────────────────────────────────────────────────────────

def _from_json() -> Dict[str, Any]:
    try:
        from app.db.database import load_assets
        from app.utils.allocation_engine import build_allocation_metrics
        from app.utils.portfolio_engine import calculate_portfolio_overview

        assets   = load_assets()
        overview = calculate_portfolio_overview(assets)
        alloc    = build_allocation_metrics(assets)
        return {"assets": assets, "overview": overview, "allocation": alloc}
    except Exception as exc:
        return {"assets": [], "overview": {}, "allocation": {}, "error": str(exc)}
