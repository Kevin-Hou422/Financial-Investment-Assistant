from typing import Dict, List
import uuid

from sqlalchemy.orm import Session

from app.db.models import Alert


def _row(a: Alert) -> Dict:
    return {"id": a.id, "user_id": a.user_id, "symbol": a.symbol,
            "asset_type": a.asset_type, "exchange": a.exchange or "",
            "direction": a.direction, "target_price": a.target_price}


def list_alerts(db: Session, user_id: str) -> List[Dict]:
    return [_row(a) for a in
            db.query(Alert).filter(Alert.user_id == user_id).all()]


def create_alert(db: Session, user_id: str, data: Dict) -> Dict:
    alert = Alert(
        id=str(uuid.uuid4()), user_id=user_id, symbol=data["symbol"],
        asset_type=data.get("asset_type", "Stock"),
        exchange=data.get("exchange") or "",
        direction=data.get("direction", "above"),
        target_price=float(data["target_price"]),
    )
    db.add(alert); db.commit(); db.refresh(alert)
    return _row(alert)


def delete_alert(db: Session, user_id: str, alert_id: str) -> bool:
    alert = db.query(Alert).filter(
        Alert.id == alert_id, Alert.user_id == user_id
    ).first()
    if not alert:
        return False
    db.delete(alert); db.commit()
    return True
