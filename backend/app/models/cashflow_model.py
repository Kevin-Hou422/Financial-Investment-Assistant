from datetime import date
from enum import Enum

from pydantic import BaseModel, Field


class CashflowType(str, Enum):
    DEPOSIT = "Deposit"
    WITHDRAW = "Withdraw"
    DIVIDEND = "Dividend"
    FEE = "Fee"


class CashflowBase(BaseModel):
    type: CashflowType = Field(..., description="Deposit/Withdraw/Dividend/Fee")
    amount: float = Field(..., gt=0)
    date: date
    note: str | None = None


class CashflowCreate(CashflowBase):
    pass


class Cashflow(CashflowBase):
    id: str

