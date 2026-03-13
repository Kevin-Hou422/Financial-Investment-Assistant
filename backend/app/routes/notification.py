from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets
from app.db.cashflow_repo import list_cashflows
from app.db.plan_repo import list_plans
from app.db.models import User
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

CONCENTRATION_THRESHOLD = 0.5
GOAL_NEAR_THRESHOLD = 0.9


@router.get("")
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    assets = list_assets(db, uid)
    plans = list_plans(db, uid)
    cashflows = list_cashflows(db, uid)
    notifications = []

    total_value = sum(a.get("total_value", 0) for a in assets)
    if total_value > 0:
        from collections import defaultdict
        type_values = defaultdict(float)
        for a in assets:
            type_values[a["type"]] += a.get("total_value", 0)
        for t, v in type_values.items():
            pct = v / total_value
            if pct >= CONCENTRATION_THRESHOLD:
                notifications.append({
                    "type": "concentration",
                    "level": "warning",
                    "message": f"{t} makes up {pct*100:.1f}% of your portfolio — consider diversifying.",
                })

    for p in plans:
        progress = p["current_amount"] / p["target_amount"] if p["target_amount"] else 0
        if progress >= GOAL_NEAR_THRESHOLD and progress < 1.0:
            notifications.append({
                "type": "goal",
                "level": "success",
                "message": f"Goal '{p['name']}' is {progress*100:.0f}% complete — almost there!",
            })
        elif progress >= 1.0:
            notifications.append({
                "type": "goal",
                "level": "success",
                "message": f"Goal '{p['name']}' has been achieved!",
            })

    total_in = sum(c["amount"] for c in cashflows if c["type"] in ("Deposit", "Dividend"))
    total_out = sum(c["amount"] for c in cashflows if c["type"] in ("Withdraw", "Fee"))
    if total_out > total_in * 0.5 and total_in > 0:
        notifications.append({
            "type": "cashflow",
            "level": "danger",
            "message": f"Outflows (${total_out:,.0f}) exceed 50% of inflows (${total_in:,.0f}).",
        })

    if not notifications:
        notifications.append({
            "type": "info",
            "level": "info",
            "message": "Portfolio looks healthy. No alerts at this time.",
        })

    return notifications
