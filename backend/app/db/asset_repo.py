"""
Thin helper functions that wrap SQLAlchemy queries for assets.
All functions require an active Session and the requesting user_id.
"""
from typing import Dict, List, Optional
import uuid

from sqlalchemy.orm import Session

from app.db.models import Asset


def _row_to_dict(a: Asset) -> Dict:
    return {
        "id": a.id,
        "user_id": a.user_id,
        "name": a.name,
        "type": a.type,
        "exchange": a.exchange or "",
        "quantity": a.quantity,
        "price": a.price,
        "total_value": a.total_value,
        "buy_date": a.buy_date,
    }


def list_assets(db: Session, user_id: str,
                asset_type: Optional[str] = None,
                exchange: Optional[str] = None) -> List[Dict]:
    q = db.query(Asset).filter(Asset.user_id == user_id)
    if asset_type:
        q = q.filter(Asset.type == asset_type)
    if exchange:
        q = q.filter(Asset.exchange == exchange)
    return [_row_to_dict(a) for a in q.all()]


def create_asset(db: Session, user_id: str, data: Dict) -> Dict:
    asset = Asset(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=data["name"],
        type=data["type"],
        exchange=data.get("exchange") or "",
        quantity=float(data["quantity"]),
        price=float(data["price"]),
        total_value=round(float(data["quantity"]) * float(data["price"]), 2),
        buy_date=str(data["buy_date"]),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _row_to_dict(asset)


def update_asset(db: Session, user_id: str, asset_id: str, data: Dict) -> Optional[Dict]:
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == user_id).first()
    if not asset:
        return None
    asset.name = data["name"]
    asset.type = data["type"]
    asset.exchange = data.get("exchange") or ""
    asset.quantity = float(data["quantity"])
    asset.price = float(data["price"])
    asset.total_value = round(float(data["quantity"]) * float(data["price"]), 2)
    asset.buy_date = str(data["buy_date"])
    db.commit()
    db.refresh(asset)
    return _row_to_dict(asset)


def delete_asset(db: Session, user_id: str, asset_id: str) -> bool:
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.user_id == user_id).first()
    if not asset:
        return False
    db.delete(asset)
    db.commit()
    return True
