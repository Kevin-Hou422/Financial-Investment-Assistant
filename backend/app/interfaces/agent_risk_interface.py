from typing import Any, Dict

from app.db.database import load_assets
from app.utils.risk_engine import estimate_portfolio_risk


def get_risk_metrics() -> Dict[str, Any]:
    """
    Agent 预留接口：获取当前组合的结构化风险指标。

    返回内容与 /api/risk/metrics 接口一致，仅用于 Agent 消费。
    """
    assets = load_assets()
    return estimate_portfolio_risk(assets)

