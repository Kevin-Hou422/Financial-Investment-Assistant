"""
Agent routes.

  GET  /agent/analyze_portfolio  — legacy placeholder (kept for compatibility)
  GET  /agent/recommend_assets   — legacy placeholder
  GET  /agent/risk_analysis      — legacy placeholder
  POST /agent/chat               — multi-agent chat (intent → manager → workflow → agent)
  GET  /agent/intents            — list supported intents
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.interfaces.agent_portfolio_interface import get_current_portfolio
from app.interfaces.agent_market_interface import get_market_snapshot
from app.interfaces.agent_risk_interface import get_risk_metrics
from app.utils.auth_utils import get_current_user
from backend.app.agents.core.manager import manager_agent
from backend.app.agents.workflows.workflow import workflow_engine
from backend.app.agents.tools.tools import ToolRegistry
from backend.app.agents.core.base import AgentTask, AgentStatus

router = APIRouter(prefix="/agent", tags=["agent"])


# ── Legacy placeholder endpoints ─────────────────────────────────────────────

@router.get("/analyze_portfolio")
def agent_analyze_portfolio() -> dict:
    return {"status": "placeholder", "portfolio": get_current_portfolio()}


@router.get("/recommend_assets")
def agent_recommend_assets() -> dict:
    return {"status": "placeholder", "market_snapshot": get_market_snapshot(), "recommendations": []}


@router.get("/risk_analysis")
def agent_risk_analysis() -> dict:
    return {"status": "placeholder", "risk": get_risk_metrics()}


# ── Multi-agent chat ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    token_budget: Optional[int] = 600   # hard cap; lower = cheaper


class ChatResponse(BaseModel):
    task_id: str
    intent: str
    agent: str
    status: str
    output: Dict[str, Any]
    tokens_used: int
    latency_ms: int
    error: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def agent_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Full multi-agent pipeline:
      1. ManagerAgent.parse_intent()  — zero tokens (keyword scoring)
      2. ManagerAgent.route()         — picks agent name
      3. WorkflowEngine.run_single()  — dispatches AgentTask to agent
      4. Agent fetches data via ToolRegistry then calls LLM
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    token_budget = max(100, min(req.token_budget or 600, 1500))

    # 1 + 2: intent parsing & routing (no LLM cost)
    intent = manager_agent.parse_intent(req.message)
    agent_name = manager_agent.route(intent)

    # 3: build task
    task_id = str(uuid.uuid4())[:8]
    task = AgentTask(
        task_id=task_id,
        agent_name=agent_name,
        intent=req.message,
        context={"intent": intent},
        token_budget=token_budget,
    )

    # 4: create per-request tool registry (scoped to current user)
    tools = ToolRegistry(db=db, user_id=current_user["user_id"])

    # 5: run
    result = await workflow_engine.run_single(agent_name, task, tools)

    return ChatResponse(
        task_id=task_id,
        intent=intent,
        agent=agent_name,
        status=result.status.value,
        output=result.output,
        tokens_used=result.tokens_used,
        latency_ms=result.latency_ms,
        error=result.error,
    )


# ── Introspection ─────────────────────────────────────────────────────────────

@router.get("/intents")
def list_intents() -> dict:
    """Returns all supported intents and their target agents."""
    return {
        "intents": manager_agent.describe(),
        "agents": workflow_engine.list_agents(),
    }
