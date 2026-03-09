from fastapi import APIRouter

from app.db.database import load_assets
from app.utils.analytics_engine import portfolio_analytics


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
def get_analytics_summary() -> dict:
    """
    Portfolio-level analytics:
    - total_value
    - naive value-weighted portfolio return
    - per-asset value and return.
    """
    assets = load_assets()
    return portfolio_analytics(assets)

