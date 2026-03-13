from typing import Dict, List
import uuid

from sqlalchemy.orm import Session

from app.db.models import WatchlistItem


def _row(w: WatchlistItem) -> Dict:
    return {"id": w.id, "user_id": w.user_id, "symbol": w.symbol,
            "asset_type": w.asset_type, "note": w.note or ""}


def list_watchlist(db: Session, user_id: str) -> List[Dict]:
    return [_row(w) for w in
            db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id).all()]


def create_watch_item(db: Session, user_id: str, data: Dict) -> Dict:
    item = WatchlistItem(
        id=str(uuid.uuid4()), user_id=user_id, symbol=data["symbol"],
        asset_type=data.get("asset_type", "Stock"),
        note=data.get("note") or "",
    )
    db.add(item); db.commit(); db.refresh(item)
    return _row(item)


def delete_watch_item(db: Session, user_id: str, item_id: str) -> bool:
    item = db.query(WatchlistItem).filter(
        WatchlistItem.id == item_id, WatchlistItem.user_id == user_id
    ).first()
    if not item:
        return False
    db.delete(item); db.commit()
    return True
