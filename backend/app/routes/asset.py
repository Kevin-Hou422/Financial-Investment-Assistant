from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets, create_asset, update_asset, delete_asset
from app.db.models import User
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/assets", tags=["assets"])


class AssetInput(BaseModel):
    name: str
    type: str
    exchange: Optional[str] = ""
    quantity: float
    price: float
    buy_date: str


@router.get("")
def get_assets(
    type: Optional[str] = None,
    exchange: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_assets(db, current_user.id, asset_type=type, exchange=exchange)


@router.post("")
def add_asset(
    data: AssetInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_asset(db, current_user.id, data.model_dump())


@router.put("/{asset_id}")
def edit_asset(
    asset_id: str,
    data: AssetInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = update_asset(db, current_user.id, asset_id, data.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Asset not found")
    return result


@router.delete("/{asset_id}")
def remove_asset(
    asset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not delete_asset(db, current_user.id, asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"ok": True}
