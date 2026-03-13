from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.cashflow_repo import list_cashflows, create_cashflow, delete_cashflow
from app.db.models import User
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/cashflows", tags=["cashflows"])


class CashflowInput(BaseModel):
    type: str
    amount: float
    date: str
    note: Optional[str] = ""


@router.get("")
def get_cashflows(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_cashflows(db, current_user.id)


@router.post("")
def add_cashflow(
    data: CashflowInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_cashflow(db, current_user.id, data.model_dump())


@router.delete("/{cashflow_id}")
def remove_cashflow(
    cashflow_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not delete_cashflow(db, current_user.id, cashflow_id):
        raise HTTPException(status_code=404, detail="Cashflow not found")
    return {"ok": True}
