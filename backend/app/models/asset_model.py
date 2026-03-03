from pydantic import BaseModel, Field
from datetime import date

class AssetBase(BaseModel):
    name: str
    type: str = Field(..., description="Stock, Fund, Crypto, Gold")
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    buy_date: date

class AssetCreate(AssetBase):
    pass

class Asset(AssetBase):
    id: str
    total_value: float