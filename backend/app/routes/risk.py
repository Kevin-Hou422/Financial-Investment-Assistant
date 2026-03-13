from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets
from app.db.models import User
from app.utils.auth_utils import get_current_user
from app.utils.portfolio_engine import compute_risk_metrics

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("")
def get_risk_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = list_assets(db, current_user.id)
    return compute_risk_metrics(assets)
