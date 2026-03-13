from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets
from app.db.models import User
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("")
def get_strategy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = list_assets(db, current_user.id)
    total = sum(a.get("total_value", 0) for a in assets)
    if not total:
        total = 10000.0

    # Simple linear projection over 12 months with a slight growth
    today = datetime.today()
    dates = [(today + timedelta(days=30 * i)).strftime("%Y-%m") for i in range(13)]
    rate = 0.007  # ~8.4% annual
    portfolio_values = [round(total * ((1 + rate) ** i), 2) for i in range(13)]

    return {
        "message": "Projected portfolio growth based on current allocation.",
        "dates": dates,
        "portfolio_values": portfolio_values,
    }
