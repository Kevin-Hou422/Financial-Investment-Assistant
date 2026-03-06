from datetime import date

from pydantic import BaseModel, Field


class PlanBase(BaseModel):
    name: str = Field(..., description="Plan or goal name")
    target_amount: float = Field(..., gt=0)
    current_amount: float = Field(..., ge=0)
    deadline: date


class PlanCreate(PlanBase):
    pass


class Plan(PlanBase):
    id: str

