from fastapi import APIRouter, Response

from app.db.cashflow_repo import load_cashflows
from app.db.database import load_assets
from app.db.plan_repo import load_plans
from app.utils.portfolio_engine import calculate_portfolio_overview


router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/assets")
def asset_report():
    """
    资产报表：返回当前全部资产明细。
    """
    return {"assets": load_assets()}


@router.get("/performance")
def performance_report():
    """
    收益报表：返回组合概览 + 资金流水 + 目标计划，用于前端生成图表。
    """
    assets = load_assets()
    overview = calculate_portfolio_overview(assets)
    cashflows = load_cashflows()
    plans = load_plans()
    return {
        "overview": overview,
        "cashflows": cashflows,
        "plans": plans,
    }


@router.get("/export/csv")
def export_csv() -> Response:
    """
    简单 CSV 导出：导出当前资产列表为 CSV 文件。
    """
    assets = load_assets()
    headers = ["id", "name", "type", "quantity", "price", "total_value", "buy_date"]
    lines = [",".join(headers)]
    for a in assets:
        row = [str(a.get(h, "")) for h in headers]
        lines.append(",".join(row))
    csv_content = "\n".join(lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="asset_report.csv"'},
    )

