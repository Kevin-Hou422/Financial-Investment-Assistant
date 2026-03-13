from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import csv, io
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets
from app.db.cashflow_repo import list_cashflows
from app.db.plan_repo import list_plans
from app.db.models import User
from app.utils.auth_utils import get_current_user
from app.utils.portfolio_engine import compute_summary

router = APIRouter(prefix="/api/report", tags=["report"])


@router.get("/performance")
def performance_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = current_user.id
    assets = list_assets(db, uid)
    cashflows = list_cashflows(db, uid)
    plans = list_plans(db, uid)
    overview = compute_summary(assets)
    return {"overview": overview, "assets": assets, "cashflows": cashflows, "plans": plans}


@router.get("/export/csv")
def export_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = list_assets(db, current_user.id)
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["id", "name", "type", "exchange", "quantity", "price", "total_value", "buy_date"],
    )
    writer.writeheader()
    for a in assets:
        writer.writerow({k: a.get(k, "") for k in writer.fieldnames})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=assets.csv"},
    )
