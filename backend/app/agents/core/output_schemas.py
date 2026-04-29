"""
Pydantic output schemas for each agent's LLM response.

Purpose: validate that the LLM returned the expected fields with the right types.
If validation fails the raw dict is returned with missing fields filled in with
safe defaults, so downstream code never receives a KeyError or None surprise.

Usage in each agent:
    from app.agents.core.output_schemas import coerce_output, PortfolioOverviewOutput
    output = coerce_output(raw_dict, PortfolioOverviewOutput)
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Type, Union

from pydantic import BaseModel, Field, field_validator

log = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def coerce_output(raw: Dict[str, Any], schema: Type[BaseModel]) -> Dict[str, Any]:
    """
    Validate raw LLM output against schema.
    On success: return model.model_dump() — guaranteed field presence.
    On failure: log a warning, return raw merged with schema defaults.
    """
    try:
        validated = schema.model_validate(raw)
        return validated.model_dump()
    except Exception as exc:
        log.warning(
            "LLM output failed schema validation (%s): %s — using defaults for missing fields",
            schema.__name__, exc,
        )
        # Return defaults merged with whatever valid keys the LLM did return
        defaults = schema().model_dump()
        defaults.update({k: v for k, v in raw.items() if k in defaults})
        return defaults


# ── Portfolio Agent outputs ───────────────────────────────────────────────────

class PortfolioOverviewOutput(BaseModel):
    summary: str = "No summary available."
    highlights: List[str] = Field(default_factory=list)
    allocation_comment: str = ""


class RiskAssessmentOutput(BaseModel):
    risk_level: str = "unknown"
    key_risks: List[str] = Field(default_factory=list)
    recommendation: str = ""

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        allowed = {"low", "medium", "high", "unknown"}
        return v.lower() if v.lower() in allowed else "unknown"


class PerformanceReviewOutput(BaseModel):
    best_performer: str = ""
    worst_performer: str = ""
    overall_assessment: str = "No assessment available."
    action_hint: str = ""


class RebalanceAdviceOutput(BaseModel):
    overweight: List[str] = Field(default_factory=list)
    underweight: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)
    rationale: str = ""


class GoalTrackingOutput(BaseModel):
    on_track: bool = False
    at_risk_goals: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    summary: str = ""


# ── Risk Agent output ─────────────────────────────────────────────────────────

class RiskAnalysisOutput(BaseModel):
    risk_score: int = 0
    risk_level: str = "unknown"
    top_risks: List[Dict[str, str]] = Field(default_factory=list)
    concentration_warning: Optional[str] = None
    recommended_actions: List[str] = Field(default_factory=list)
    summary: str = ""

    @field_validator("risk_score")
    @classmethod
    def clamp_score(cls, v: Any) -> int:
        try:
            return max(0, min(100, int(v)))
        except (TypeError, ValueError):
            return 0

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        allowed = {"low", "medium", "high", "critical", "unknown"}
        return v.lower() if v.lower() in allowed else "unknown"


# ── Strategy Agent output ─────────────────────────────────────────────────────

class RebalanceAction(BaseModel):
    action: str = "hold"
    asset_type: str = ""
    reason: str = ""

    @field_validator("action")
    @classmethod
    def validate_action(cls, v: str) -> str:
        allowed = {"buy", "sell", "hold"}
        return v.lower() if v.lower() in allowed else "hold"


class StrategyOutput(BaseModel):
    strategy_type: str = "balanced"
    rebalance_actions: List[Union[RebalanceAction, Dict]] = Field(default_factory=list)
    target_allocation: Dict[str, Any] = Field(default_factory=dict)
    next_steps: List[str] = Field(default_factory=list)
    rationale: str = ""

    @field_validator("strategy_type")
    @classmethod
    def validate_strategy(cls, v: str) -> str:
        allowed = {"conservative", "balanced", "aggressive"}
        return v.lower() if v.lower() in allowed else "balanced"


# ── Market Agent output ───────────────────────────────────────────────────────

class MarketAnalysisOutput(BaseModel):
    market_sentiment: str = "neutral"
    live_quotes_summary: str = ""
    watchlist_highlights: List[Dict[str, str]] = Field(default_factory=list)
    active_alerts: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    risks_from_market: List[str] = Field(default_factory=list)
    summary: str = ""

    @field_validator("market_sentiment")
    @classmethod
    def validate_sentiment(cls, v: str) -> str:
        allowed = {"bullish", "neutral", "bearish"}
        return v.lower() if v.lower() in allowed else "neutral"


# ── Research Agent output ─────────────────────────────────────────────────────

class ResearchOutput(BaseModel):
    performance_grade: str = "C"
    top_performers: List[Dict[str, Any]] = Field(default_factory=list)
    underperformers: List[Dict[str, Any]] = Field(default_factory=list)
    due_diligence_flags: List[str] = Field(default_factory=list)
    cashflow_comment: str = ""
    overall_verdict: str = ""

    @field_validator("performance_grade")
    @classmethod
    def validate_grade(cls, v: str) -> str:
        allowed = {"A", "B", "C", "D", "F"}
        return v.upper() if v.upper() in allowed else "C"


# ── Per-intent schema dispatch ────────────────────────────────────────────────

PORTFOLIO_INTENT_SCHEMAS: Dict[str, Type[BaseModel]] = {
    "portfolio_overview": PortfolioOverviewOutput,
    "risk_analysis":      RiskAssessmentOutput,
    "performance_review": PerformanceReviewOutput,
    "rebalance_advice":   RebalanceAdviceOutput,
    "goal_tracking":      GoalTrackingOutput,
}
