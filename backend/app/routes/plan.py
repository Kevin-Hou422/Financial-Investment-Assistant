from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.plan_repo import list_plans, create_plan, update_plan, delete_plan
from app.db.models import User
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/plans", tags=["plans"])


class PlanInput(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    deadline: str


@router.get("")
def get_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_plans(db, current_user.id)


@router.post("")
def add_plan(
    data: PlanInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_plan(db, current_user.id, data.model_dump())


@router.put("/{plan_id}")
def edit_plan(
    plan_id: str,
    data: PlanInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_plan(db, current_user.id, plan_id, data.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Plan not found")
    return result


@router.delete("/{plan_id}")
def remove_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not delete_plan(db, current_user.id, plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"ok": True}
