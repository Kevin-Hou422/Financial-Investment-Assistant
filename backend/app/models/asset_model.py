from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AssetBase(BaseModel):
    name: str
    type: str = Field(
        ...,
        description="Stock, Fund, Crypto, Gold, Bond, Forex, Custom",
    )
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    buy_date: date
    exchange: Optional[str] = Field(
        None,
        description="Sub-category by market: Stock=US|HK|AShare, Fund=Domestic|International, etc.",
    )


class AssetCreate(AssetBase):
    pass


class Asset(AssetBase):
    id: str
    total_value: float