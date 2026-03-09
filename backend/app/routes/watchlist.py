from typing import List

from fastapi import APIRouter, HTTPException

from app.db.watchlist_repo import load_watchlist, save_watchlist

import uuid


router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


@router.get("", response_model=List[dict])
def list_watchlist() -> List[dict]:
    return load_watchlist()


@router.post("", response_model=dict)
def add_watch_item(item: dict) -> dict:
    """
    Expected fields:
    - symbol
    - asset_type
    - note (optional)
    """
    data = {
        "id": str(uuid.uuid4()),
        "symbol": item.get("symbol"),
        "asset_type": item.get("asset_type", "Stock"),
        "note": item.get("note"),
    }
    if not data["symbol"]:
        raise HTTPException(status_code=400, detail="symbol is required")

    items = load_watchlist()
    items.append(data)
    save_watchlist(items)
    return data


@router.delete("/{item_id}")
def delete_watch_item(item_id: str):
    items = load_watchlist()
    filtered = [i for i in items if i["id"] != item_id]
    if len(filtered) == len(items):
        raise HTTPException(status_code=404, detail="Watch item not found")
    save_watchlist(filtered)
    return {"message": "Deleted"}

