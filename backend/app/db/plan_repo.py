from typing import Dict, List, Optional
import uuid

from sqlalchemy.orm import Session

from app.db.models import Plan


def _row(p: Plan) -> Dict:
    return {"id": p.id, "user_id": p.user_id, "name": p.name,
            "target_amount": p.target_amount, "current_amount": p.current_amount,
            "deadline": p.deadline}


def list_plans(db: Session, user_id: str) -> List[Dict]:
    return [_row(p) for p in
            db.query(Plan).filter(Plan.user_id == user_id).all()]


def create_plan(db: Session, user_id: str, data: Dict) -> Dict:
    plan = Plan(
        id=str(uuid.uuid4()), user_id=user_id, name=data["name"],
        target_amount=float(data["target_amount"]),
        current_amount=float(data["current_amount"]),
        deadline=str(data["deadline"]),
    )
    db.add(plan); db.commit(); db.refresh(plan)
    return _row(plan)


def update_plan(db: Session, user_id: str, plan_id: str, data: Dict) -> Optional[Dict]:
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user_id).first()
    if not plan:
        return None
    plan.name = data["name"]
    plan.target_amount = float(data["target_amount"])
    plan.current_amount = float(data["current_amount"])
    plan.deadline = str(data["deadline"])
    db.commit(); db.refresh(plan)
    return _row(plan)


def delete_plan(db: Session, user_id: str, plan_id: str) -> bool:
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == user_id).first()
    if not plan:
        return False
    db.delete(plan); db.commit()
    return True
