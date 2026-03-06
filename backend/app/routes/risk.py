from fastapi import APIRouter

from app.db.database import load_assets
from app.utils.risk_engine import estimate_portfolio_risk


router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/metrics")
def get_risk_metrics():
    """
    风险分析接口：
    - 年化波动率
    - 估算最大回撤
    - 标准差（与波动率一致）
    - 风险评分 / 等级
    - 当前资产类型配置快照
    """
    assets = load_assets()
    return estimate_portfolio_risk(assets)

