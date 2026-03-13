from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.watchlist_repo import list_watchlist, create_watch_item, delete_watch_item
from app.db.models import User
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class WatchlistInput(BaseModel):
    symbol: str
    asset_type: Optional[str] = "Stock"
    note: Optional[str] = ""


@router.get("")
def get_watchlist(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_watchlist(db, current_user.id)


@router.post("")
def add_watchlist(
    data: WatchlistInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_watch_item(db, current_user.id, data.model_dump())


@router.delete("/{item_id}")
def remove_watchlist(
    item_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not delete_watch_item(db, current_user.id, item_id):
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"ok": True}
