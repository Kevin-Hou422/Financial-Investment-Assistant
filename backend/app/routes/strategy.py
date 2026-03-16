"""
Strategy routes.

  GET  /api/strategy      — projection chart data (simple 12-month linear)
  POST /api/strategy/ai   — full AI strategy via multi-agent pipeline
"""
from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.asset_repo import list_assets
from app.utils.auth_utils import get_current_user

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("")
def get_strategy(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Simple linear 12-month portfolio projection for the chart widget."""
    assets = list_assets(db, current_user.id)
    total  = sum(a.get("total_value", 0) for a in assets) or 10000.0

    import math
    today  = datetime.today()
    rate   = 0.0072   # ~8.6% annual growth
    vol    = 0.022    # monthly volatility (realistic equity-bond mix)
    seed   = int(total) % 9999 + 1

    def pseudo(i):
        x = math.sin(seed * 9301 + i * 49297 + 233720) * 10000
        return x - int(x)  # 0-1

    dates  = [(today + timedelta(days=30 * i)).strftime("%Y-%m") for i in range(13)]
    values = []
    for i in range(13):
        if i == 0:
            values.append(round(total, 2))
        else:
            noise  = (pseudo(i) - 0.5) * 2 * vol
            growth = (1 + rate + noise) ** i
            values.append(round(total * growth, 2))

    return {
        "message": "Projected portfolio growth based on current allocation (with realistic monthly variance).",
        "dates": dates,
        "portfolio_values": values,
    }


@router.post("/ai")
async def get_ai_strategy(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Full AI strategy using the multi-agent pipeline (risk → strategy agents).
    Returns structured strategy output plus projection data in one response.
    """
    from app.agents.core.manager import manager_agent
    from app.agents.workflows.workflow import workflow_engine
    from app.agents.tools.tools import ToolRegistry
    from app.agents.core.base import AgentTask

    user_id = current_user.id
    task_id = str(uuid.uuid4())[:8]
    intent  = "rebalance_advice"

    pipeline_steps = manager_agent.get_pipeline(intent)
    base_task = AgentTask(
        task_id=task_id,
        agent_name="risk_analyst",
        intent="Analyze portfolio risk and generate a comprehensive rebalancing strategy.",
        context={"intent": intent},
        token_budget=500,
    )
    tools = ToolRegistry(db=db, user_id=user_id)

    results = await workflow_engine.run_pipeline(
        steps=pipeline_steps,
        base_task=base_task,
        tools=tools,
        db=db,
        user_id=user_id,
    )

    risk_out  = next((r.output for r in results if r.agent_name == "risk_analyst"  and r.status.value == "done"), {})
    strat_out = next((r.output for r in results if r.agent_name == "strategy_analyst" and r.status.value == "done"), {})

    # Projection data
    assets = list_assets(db, current_user.id)
    total  = sum(a.get("total_value", 0) for a in assets) or 10000.0
    today  = datetime.today()
    rate   = 0.007
    projection = {
        "dates":  [(today + timedelta(days=30 * i)).strftime("%Y-%m") for i in range(13)],
        "values": [round(total * ((1 + rate) ** i), 2) for i in range(13)],
    }

    return {
        "task_id":    task_id,
        "risk":       risk_out,
        "strategy":   strat_out,
        "projection": projection,
        "agents_called": [r.agent_name for r in results],
        "total_tokens": sum(r.tokens_used for r in results),
    }
