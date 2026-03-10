from typing import List

from fastapi import APIRouter, HTTPException

from app.db.alert_repo import load_alerts, save_alerts
from app.external.crypto_api import fetch_crypto_price
from app.external.fund_api import fetch_fund_price
from app.external.gold_api import fetch_gold_price
from app.external.stock_api import fetch_stock_price

import uuid


router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _fetch_price(symbol: str, asset_type: str, exchange: str = "") -> float | None:
    asset_type = asset_type.lower()
    if asset_type == "crypto":
        data = fetch_crypto_price(symbol)
    elif asset_type == "fund":
        data = fetch_fund_price(symbol)
    elif asset_type == "gold":
        data = fetch_gold_price(symbol)
    else:
        data = fetch_stock_price(
            symbol, asset_type="stock", exchange=exchange or None
        )
    return data.get("price")


@router.get("", response_model=List[dict])
def list_alerts() -> List[dict]:
    return load_alerts()


@router.post("", response_model=dict)
def create_alert(alert_in: dict) -> dict:
    """
    Expected fields:
    - symbol
    - asset_type
    - direction: 'above' | 'below'
    - target_price: float
    """
    symbol = alert_in.get("symbol")
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")

    direction = alert_in.get("direction", "above")
    if direction not in ("above", "below"):
        raise HTTPException(status_code=400, detail="direction must be above/below")

    try:
        target_price = float(alert_in.get("target_price"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="target_price must be a number")

    data = {
        "id": str(uuid.uuid4()),
        "symbol": symbol,
        "asset_type": alert_in.get("asset_type", "Stock"),
        "exchange": alert_in.get("exchange", ""),
        "direction": direction,
        "target_price": target_price,
    }

    alerts = load_alerts()
    alerts.append(data)
    save_alerts(alerts)
    return data


@router.delete("/{alert_id}")
def delete_alert(alert_id: str):
    alerts = load_alerts()
    filtered = [a for a in alerts if a["id"] != alert_id]
    if len(filtered) == len(alerts):
        raise HTTPException(status_code=404, detail="Alert not found")
    save_alerts(filtered)
    return {"message": "Deleted"}


@router.get("/check", response_model=List[dict])
def check_alerts() -> List[dict]:
    """
    Check all alerts against current market price and return those that
    are currently triggered.
    """
    alerts = load_alerts()
    triggered: List[dict] = []
    for a in alerts:
        price = _fetch_price(
            a["symbol"],
            a.get("asset_type", "Stock"),
            a.get("exchange", ""),
        )
        if price is None:
            continue
        if a["direction"] == "above" and price >= a["target_price"]:
            triggered.append({**a, "current_price": price})
        if a["direction"] == "below" and price <= a["target_price"]:
            triggered.append({**a, "current_price": price})
    return triggered

