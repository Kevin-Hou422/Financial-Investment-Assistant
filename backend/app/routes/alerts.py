from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.alert_repo import list_alerts, create_alert, delete_alert
from app.db.models import User
from app.utils.auth_utils import get_current_user
from app.external.stock_api import fetch_stock_price
from app.external.crypto_api import fetch_crypto_price
from app.external.gold_api import fetch_gold_price
from app.external.fund_api import fetch_fund_price


def _get_price(symbol: str, asset_type: str, exchange: str = "") -> Optional[float]:
    t = asset_type.lower()
    if t == "stock":
        r = fetch_stock_price(symbol, asset_type="stock", exchange=exchange)
    elif t == "crypto":
        r = fetch_crypto_price(symbol)
    elif t == "gold":
        r = fetch_gold_price(symbol)
    elif t == "fund":
        r = fetch_fund_price(symbol)
    else:
        r = fetch_stock_price(symbol)
    p = r.get("price") if r else None
    return float(p) if p else None

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertInput(BaseModel):
    symbol: str
    asset_type: Optional[str] = "Stock"
    exchange: Optional[str] = ""
    direction: str
    target_price: float


@router.get("")
def get_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_alerts(db, current_user.id)


@router.post("")
def add_alert(
    data: AlertInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_alert(db, current_user.id, data.model_dump())


@router.delete("/{alert_id}")
def remove_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not delete_alert(db, current_user.id, alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"ok": True}


@router.get("/check")
def check_triggered(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alerts = list_alerts(db, current_user.id)
    triggered = []
    for a in alerts:
        try:
            price = _get_price(a["symbol"], a["asset_type"], a.get("exchange", ""))
            if price is None:
                continue
            hit = (a["direction"] == "above" and price >= a["target_price"]) or \
                  (a["direction"] == "below" and price <= a["target_price"])
            if hit:
                triggered.append({**a, "current_price": price})
        except Exception:
            continue
    return triggered
