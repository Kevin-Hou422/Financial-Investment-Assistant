"""
agent_research_interface — performance analytics for agents.

Supports two calling modes:
  • New (SQLAlchemy): get_research_data(db, user_id)
  • Legacy (JSON):    get_research_data()
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session


def get_research_data(
    db: Optional[Session] = None,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Returns analytics + cashflow data for ResearchAnalystAgent.

    Fields:
      analytics — per-asset returns, top 5 ranked
      cashflow  — inflow / outflow / net
      goals     — financial plan progress
    """
    if db is not None and user_id:
        return _from_sqlalchemy(db, user_id)
    return _from_json()


def _from_sqlalchemy(db: Session, user_id: str) -> Dict[str, Any]:
    from app.db.asset_repo    import list_assets
    from app.db.cashflow_repo import list_cashflows
    from app.db.plan_repo     import list_plans
    from app.utils.portfolio_engine import compute_analytics

    assets  = list_assets(db, user_id)
    cfs     = list_cashflows(db, user_id)
    plans   = list_plans(db, user_id)

    analytics = compute_analytics(assets)
    analytics["assets"] = sorted(
        analytics.get("assets", []),
        key=lambda x: x.get("return_pct", 0),
        reverse=True,
    )[:5]

    inflow  = sum(c["amount"] for c in cfs if c["type"] in ("Deposit", "Dividend"))
    outflow = sum(c["amount"] for c in cfs if c["type"] in ("Withdraw", "Fee"))

    goals = [
        {
            "name": p["name"],
            "progress_pct": round(p["current_amount"] / p["target_amount"] * 100, 1)
            if p.get("target_amount") else 0,
            "remaining": round((p.get("target_amount") or 0) - (p.get("current_amount") or 0), 2),
            "deadline": p.get("deadline"),
        }
        for p in plans
    ]

    return {
        "analytics": analytics,
        "cashflow": {"inflow": round(inflow, 2), "outflow": round(outflow, 2), "net": round(inflow - outflow, 2)},
        "goals": goals,
    }


def _from_json() -> Dict[str, Any]:
    try:
        from app.db.database import load_assets
        from app.utils.portfolio_engine import compute_analytics

        assets    = load_assets()
        analytics = compute_analytics(assets)
        analytics["assets"] = sorted(
            analytics.get("assets", []),
            key=lambda x: x.get("return_pct", 0),
            reverse=True,
        )[:5]
        return {"analytics": analytics, "cashflow": {}, "goals": []}
    except Exception as exc:
        return {"analytics": {}, "cashflow": {}, "goals": [], "error": str(exc)}
