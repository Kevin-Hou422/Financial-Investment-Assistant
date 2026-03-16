"""
agent_risk_interface — structured risk metrics for agents.

Supports two calling modes:
  • New (SQLAlchemy): get_risk_metrics(db, user_id)
  • Legacy (JSON):    get_risk_metrics()
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session


def get_risk_metrics(
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns portfolio risk metrics compatible with /api/risk endpoint.
    Used by RiskAnalystAgent and legacy placeholder routes.
    """
    if db is not None and user_id:
        from app.db.asset_repo import list_assets
        assets = list_assets(db, user_id)
    else:
        try:
            from app.db.database import load_assets
            assets = load_assets()
        except Exception:
            assets = []

    from app.utils.risk_engine import estimate_portfolio_risk
    return estimate_portfolio_risk(assets)
