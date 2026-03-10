from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import uuid
from app.models.asset_model import Asset, AssetCreate
from app.db.database import load_assets, save_assets
from app.utils.helpers import validate_asset_data

router = APIRouter()

@router.get("/api/assets", response_model=List[Asset])
def get_assets(
    type: Optional[str] = Query(None, description="Asset type filter"),
    exchange: Optional[str] = Query(None, description="Exchange/category filter"),
):
    assets = load_assets()
    if type:
        assets = [a for a in assets if a.get("type") == type]
    if exchange:
        assets = [a for a in assets if a.get("exchange") == exchange]
    return assets

@router.post("/api/assets", response_model=Asset)
def create_asset(asset_in: AssetCreate):
    data = asset_in.dict()
    data["buy_date"] = str(data["buy_date"])
    if data.get("exchange") is None:
        data["exchange"] = ""
    if not validate_asset_data(data):
        raise HTTPException(status_code=400, detail="Invalid asset data")
    
    new_asset = data.copy()
    new_asset["id"] = str(uuid.uuid4())
    new_asset["total_value"] = round(new_asset["quantity"] * new_asset["price"], 2)
    
    assets = load_assets()
    assets.append(new_asset)
    save_assets(assets)
    return new_asset

@router.put("/api/assets/{asset_id}", response_model=Asset)
def update_asset(asset_id: str, asset_in: AssetCreate):
    assets = load_assets()
    for i, a in enumerate(assets):
        if a["id"] == asset_id:
            updated = asset_in.dict()
            updated["buy_date"] = str(updated["buy_date"])
            updated["id"] = asset_id
            if updated.get("exchange") is None:
                updated["exchange"] = ""
            updated["total_value"] = round(updated["quantity"] * updated["price"], 2)
            assets[i] = updated
            save_assets(assets)
            return updated
    raise HTTPException(status_code=404, detail="Asset not found")

@router.delete("/api/assets/{asset_id}")
def delete_asset(asset_id: str):
    assets = load_assets()
    filtered = [a for a in assets if a["id"] != asset_id]
    if len(assets) == len(filtered):
        raise HTTPException(status_code=404, detail="Asset not found")
    save_assets(filtered)
    return {"message": "Deleted successfully"}