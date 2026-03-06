from typing import List

from fastapi import APIRouter, HTTPException

from app.db.cashflow_repo import load_cashflows, save_cashflows
from app.models.cashflow_model import Cashflow, CashflowCreate

import uuid


router = APIRouter(prefix="/api/cashflows", tags=["cashflows"])


@router.get("", response_model=List[Cashflow])
def list_cashflows() -> List[Cashflow]:
    return load_cashflows()


@router.post("", response_model=Cashflow)
def create_cashflow(cf_in: CashflowCreate) -> Cashflow:
    data = cf_in.dict()
    data["id"] = str(uuid.uuid4())
    data["date"] = str(data["date"])

    items = load_cashflows()
    items.append(data)
    save_cashflows(items)
    return data


@router.delete("/{cashflow_id}")
def delete_cashflow(cashflow_id: str):
    items = load_cashflows()
    filtered = [i for i in items if i["id"] != cashflow_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Cashflow not found")
    save_cashflows(filtered)
    return {"message": "Deleted"}

