from typing import Any, Dict

from app.db.database import load_assets
from app.utils.allocation_engine import build_allocation_metrics
from app.utils.portfolio_engine import calculate_portfolio_overview


def get_current_portfolio() -> Dict[str, Any]:
    """
    Agent 预留接口：获取当前投资组合的结构化视图。

    仅做数据聚合，不包含任何智能决策逻辑：
    - assets: 原始资产列表
    - overview: 总成本 / 当前市值 / 盈亏
    - allocation: 类型与单资产占比、集中度
    """
    assets = load_assets()
    overview = calculate_portfolio_overview(assets)
    allocation = build_allocation_metrics(assets)
    return {
        "assets": assets,
        "overview": overview,
        "allocation": allocation,
    }

