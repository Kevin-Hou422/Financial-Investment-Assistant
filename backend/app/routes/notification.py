from datetime import date
from typing import List

from fastapi import APIRouter

from app.db.database import load_assets
from app.db.plan_repo import load_plans
from app.utils.allocation_engine import build_allocation_metrics
from app.utils.risk_engine import estimate_portfolio_risk


router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("")
def get_notifications() -> dict:
    """
    通知系统：
    - 价格/风险波动提醒（基于组合波动率）
    - 集中度提醒（Top1/Top3 或 HHI 过高）
    - 目标达成提醒（current_amount >= target_amount）
    """
    assets = load_assets()
    alloc = build_allocation_metrics(assets)
    risk = estimate_portfolio_risk(assets)
    plans = load_plans()

    notifications: List[dict] = []

    # 风险相关提醒
    if risk["risk_score"] >= 4:
      notifications.append(
        {
          "type": "risk",
          "level": "warning" if risk["risk_score"] == 4 else "danger",
          "message": f"Portfolio risk level is {risk['risk_level']} (vol {risk['volatility']}%), please review your allocation.",
        }
      )

    # 集中度提醒
    conc = alloc["concentration"]
    if conc["top1_weight_pct"] > 40:
      notifications.append(
        {
          "type": "concentration",
          "level": "warning",
          "message": f"Top 1 holding weight is {conc['top1_weight_pct']}%, portfolio may be too concentrated.",
        }
      )
    if conc["hhi"] > 0.18:
      notifications.append(
        {
          "type": "concentration",
          "level": "info",
          "message": f"Portfolio HHI is {conc['hhi']:.4f}, consider increasing diversification.",
        }
      )

    # 目标达成提醒
    today = date.today()
    for p in plans:
      if p["current_amount"] >= p["target_amount"]:
        notifications.append(
          {
            "type": "goal",
            "level": "success",
            "message": f"Goal \"{p['name']}\" has been reached!",
          }
        )
      else:
        # 距离截止日期较近的提醒
        try:
          deadline = date.fromisoformat(p["deadline"])
          days_left = (deadline - today).days
          if 0 <= days_left <= 30:
            notifications.append(
              {
                "type": "goal",
                "level": "warning",
                "message": f"Goal \"{p['name']}\" is {days_left} days from deadline.",
              }
            )
        except Exception:
          continue

    return {"items": notifications}

