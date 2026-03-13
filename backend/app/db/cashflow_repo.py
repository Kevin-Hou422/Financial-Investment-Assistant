from typing import Dict, List
import uuid

from sqlalchemy.orm import Session

from app.db.models import Cashflow


def _row(c: Cashflow) -> Dict:
    return {"id": c.id, "user_id": c.user_id, "type": c.type,
            "amount": c.amount, "date": c.date, "note": c.note or ""}


def list_cashflows(db: Session, user_id: str) -> List[Dict]:
    return [_row(c) for c in
            db.query(Cashflow).filter(Cashflow.user_id == user_id).all()]


def create_cashflow(db: Session, user_id: str, data: Dict) -> Dict:
    cf = Cashflow(
        id=str(uuid.uuid4()), user_id=user_id,
        type=data["type"], amount=float(data["amount"]),
        date=str(data["date"]), note=data.get("note") or "",
    )
    db.add(cf); db.commit(); db.refresh(cf)
    return _row(cf)


def delete_cashflow(db: Session, user_id: str, cashflow_id: str) -> bool:
    cf = db.query(Cashflow).filter(
        Cashflow.id == cashflow_id, Cashflow.user_id == user_id
    ).first()
    if not cf:
        return False
    db.delete(cf); db.commit()
    return True
