from fastapi import APIRouter

from app.interfaces.agent_portfolio_interface import get_current_portfolio
from app.interfaces.agent_market_interface import get_market_snapshot
from app.interfaces.agent_risk_interface import get_risk_metrics


router = APIRouter(prefix="/agent", tags=["agent"])


@router.get("/analyze_portfolio")
def agent_analyze_portfolio() -> dict:
    """
    Placeholder endpoint for a future AI agent to analyze the portfolio.
    Currently returns a structured snapshot only.
    """
    return {
        "status": "placeholder",
        "portfolio": get_current_portfolio(),
    }


@router.get("/recommend_assets")
def agent_recommend_assets() -> dict:
    """
    Placeholder endpoint for future AI-driven asset recommendations.
    """
    snapshot = get_market_snapshot()
    return {
        "status": "placeholder",
        "market_snapshot": snapshot,
        "recommendations": [],
    }


@router.get("/risk_analysis")
def agent_risk_analysis() -> dict:
    """
    Placeholder endpoint for future AI-driven risk analysis.
    """
    metrics = get_risk_metrics()
    return {
        "status": "placeholder",
        "risk": metrics,
    }

