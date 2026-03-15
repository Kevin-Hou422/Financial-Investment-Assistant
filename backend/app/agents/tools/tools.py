"""
ToolRegistry — pure data layer for agents.
Wraps existing DB repos and portfolio engine. NO LLM calls here.
Each tool pre-aggregates data so agents pass minimal context to the LLM.
"""
from __future__ import annotations

from typing import Any, Dict, List

from sqlalchemy.orm import Session

from app.db.asset_repo import list_assets
from app.db.cashflow_repo import list_cashflows
from app.db.plan_repo import list_plans
from app.db.alert_repo import list_alerts
from app.db.watchlist_repo import list_watchlist
from app.utils.portfolio_engine import (
    compute_summary,
    compute_risk_metrics,
    compute_analysis,
    compute_analytics,
)


class ToolRegistry:
    """
    Agent-facing data API.
    All methods return plain dicts/lists — no ORM objects — so agents can
    serialise results directly into LLM prompts.
    """

    def __init__(self, db: Session, user_id: str) -> None:
        self._db = db
        self._uid = user_id
        # Lazy cache — each raw data set fetched at most once per request
        self._assets_cache: List[Dict] | None = None

    # ── internal ─────────────────────────────────────────────────────────────

    def _assets(self) -> List[Dict]:
        if self._assets_cache is None:
            self._assets_cache = list_assets(self._db, self._uid)
        return self._assets_cache

    # ── portfolio tools ───────────────────────────────────────────────────────

    def get_portfolio_snapshot(self) -> Dict[str, Any]:
        """
        Returns a compact portfolio snapshot suitable for LLM context.
        Pre-aggregates by type to reduce token usage.
        """
        assets = self._assets()
        summary = compute_summary(assets)
        type_map: Dict[str, float] = {}
        for a in assets:
            type_map[a["type"]] = type_map.get(a["type"], 0) + a.get("total_value", 0)
        total_val = summary.get("total_current_value") or 1
        return {
            "total_value": summary["total_current_value"],
            "total_cost": summary["total_cost"],
            "pnl_amount": summary["pnl_amount"],
            "pnl_pct": summary["pnl_pct"],
            "asset_count": len(assets),
            "type_allocation": {
                t: round(v / total_val * 100, 1) for t, v in type_map.items()
            },
            "top_holdings": [
                {
                    "name": a["name"],
                    "type": a["type"],
                    "exchange": a.get("exchange", ""),
                    "value": a.get("total_value", 0),
                    "pct": round(a.get("total_value", 0) / total_val * 100, 1),
                }
                for a in sorted(assets, key=lambda x: x.get("total_value", 0), reverse=True)[:5]
            ],
        }

    def get_risk_snapshot(self) -> Dict[str, Any]:
        """Volatility, drawdown, concentration — all numeric, no LLM needed."""
        assets = self._assets()
        risk = compute_risk_metrics(assets)
        conc = compute_analysis(assets).get("concentration", {})
        return {**risk, **conc}

    def get_analytics_snapshot(self) -> Dict[str, Any]:
        """Per-asset return percentages, ranked."""
        assets = self._assets()
        result = compute_analytics(assets)
        # Sort by return desc, keep top 5 for token efficiency
        result["assets"] = sorted(
            result.get("assets", []), key=lambda x: x.get("return_pct", 0), reverse=True
        )[:5]
        return result

    # ── plan / cashflow tools ─────────────────────────────────────────────────

    def get_goals_snapshot(self) -> List[Dict[str, Any]]:
        """Returns plan progress as compact dicts."""
        plans = list_plans(self._db, self._uid)
        return [
            {
                "name": p["name"],
                "progress_pct": round(
                    p["current_amount"] / p["target_amount"] * 100, 1
                ) if p["target_amount"] else 0,
                "remaining": round(p["target_amount"] - p["current_amount"], 2),
                "deadline": p["deadline"],
            }
            for p in plans
        ]

    def get_cashflow_snapshot(self) -> Dict[str, Any]:
        cfs = list_cashflows(self._db, self._uid)
        inflow = sum(c["amount"] for c in cfs if c["type"] in ("Deposit", "Dividend"))
        outflow = sum(c["amount"] for c in cfs if c["type"] in ("Withdraw", "Fee"))
        return {
            "inflow": round(inflow, 2),
            "outflow": round(outflow, 2),
            "net": round(inflow - outflow, 2),
            "record_count": len(cfs),
        }

    # ── raw access (for advanced agents) ─────────────────────────────────────

    def get_raw_assets(self) -> List[Dict]:
        return self._assets()

    def get_raw_alerts(self) -> List[Dict]:
        return list_alerts(self._db, self._uid)

    def get_raw_watchlist(self) -> List[Dict]:
        return list_watchlist(self._db, self._uid)
