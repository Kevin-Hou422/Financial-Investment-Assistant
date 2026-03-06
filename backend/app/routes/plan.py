from typing import List

from fastapi import APIRouter, HTTPException

from app.db.plan_repo import load_plans, save_plans
from app.models.plan_model import Plan, PlanCreate

import uuid


router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("", response_model=List[Plan])
def list_plans() -> List[Plan]:
    return load_plans()


@router.post("", response_model=Plan)
def create_plan(plan_in: PlanCreate) -> Plan:
    data = plan_in.dict()
    data["id"] = str(uuid.uuid4())
    data["deadline"] = str(data["deadline"])

    items = load_plans()
    items.append(data)
    save_plans(items)
    return data


@router.put("/{plan_id}", response_model=Plan)
def update_plan(plan_id: str, plan_in: PlanCreate) -> Plan:
    items = load_plans()
    for idx, p in enumerate(items):
        if p["id"] == plan_id:
            data = plan_in.dict()
            data["id"] = plan_id
            data["deadline"] = str(data["deadline"])
            items[idx] = data
            save_plans(items)
            return data
    raise HTTPException(status_code=404, detail="Plan not found")


@router.delete("/{plan_id}")
def delete_plan(plan_id: str):
    items = load_plans()
    filtered = [i for i in items if i["id"] != plan_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Plan not found")
    save_plans(filtered)
    return {"message": "Deleted"}

