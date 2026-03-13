from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets
from app.db.models import User
from app.utils.auth_utils import get_current_user
from app.utils.portfolio_engine import compute_analytics

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
def get_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = list_assets(db, current_user.id)
    return compute_analytics(assets)
