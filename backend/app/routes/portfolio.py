from fastapi import APIRouter

from app.db.database import load_assets
from app.utils.allocation_engine import build_allocation_metrics
from app.utils.portfolio_engine import calculate_portfolio_overview


router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("/summary")
def get_portfolio_summary():
    """
    投资组合总览：总成本、当前市值、总盈亏和收益率。
    """
    assets = load_assets()
    return calculate_portfolio_overview(assets)


@router.get("/analysis")
def get_portfolio_analysis():
    """
    投资组合分析：资产类型占比、单资产占比、集中度指标。
    """
    assets = load_assets()
    return build_allocation_metrics(assets)


