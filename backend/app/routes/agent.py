"""
Agent routes.

  GET  /agent/analyze_portfolio  — legacy placeholder
  GET  /agent/recommend_assets   — legacy placeholder
  GET  /agent/risk_analysis      — legacy placeholder
  POST /agent/chat               — auto-dispatch: single agent or multi-agent pipeline
  GET  /agent/intents            — list intents, pipelines, registered agents
  GET  /agent/logs               — recent agent call logs for current user
  GET  /agent/keys/usage         — daily token usage per API key
  DELETE /agent/memory           — clear conversation memory for current user
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.utils.auth_utils import get_current_user
from app.agents.core.manager import manager_agent
from app.agents.workflows.workflow import workflow_engine
from app.agents.tools.tools import ToolRegistry
from app.agents.core.base import AgentTask, AgentStatus
from app.agents.core.memory import AgentMemory
from app.agents.core.logger import AgentLogger
from app.agents.core.cache import llm_cache
from app.agents.core.key_manager import key_manager

router = APIRouter(prefix="/agent", tags=["agent"])


# ── Legacy placeholder endpoints ─────────────────────────────────────────────
# These stay lightweight; no external API calls, just return a structure.

@router.get("/analyze_portfolio")
def agent_analyze_portfolio(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    from app.interfaces.agent_portfolio_interface import get_current_portfolio
    return {"status": "ok", "portfolio": get_current_portfolio(db, current_user["user_id"])}


@router.get("/recommend_assets")
def agent_recommend_assets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    from app.interfaces.agent_market_interface import get_market_snapshot
    return {
        "status": "ok",
        "market_snapshot": get_market_snapshot(db, current_user["user_id"]),
        "recommendations": [],
    }


@router.get("/risk_analysis")
def agent_risk_analysis(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    from app.interfaces.agent_risk_interface import get_risk_metrics
    return {"status": "ok", "risk": get_risk_metrics(db, current_user["user_id"])}


# ── Schemas ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    token_budget: Optional[int] = 600


class AgentResultOut(BaseModel):
    task_id: str
    agent_name: str
    status: str
    output: Dict[str, Any]
    tokens_used: int
    latency_ms: int
    error: Optional[str] = None


class ChatResponse(BaseModel):
    task_id: str
    intent: str
    pipeline: bool
    agents_called: List[str]
    results: List[AgentResultOut]
    total_tokens: int
    total_latency_ms: int


# ── Multi-agent chat ──────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def agent_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Unified entry point for the multi-agent system.

    Flow:
      1. ManagerAgent.parse_intent()     — zero tokens (keyword scoring)
      2. ManagerAgent.get_pipeline()     — check if multi-agent pipeline applies
      3a. WorkflowEngine.run_pipeline()  — sequential multi-agent chain
      3b. WorkflowEngine.run_single()    — single-agent dispatch (fallback)
      Memory, structured logging, and LLM cache handled inside WorkflowEngine.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    user_id      = current_user["user_id"]
    token_budget = max(100, min(req.token_budget or 600, 1500))
    task_id      = str(uuid.uuid4())[:8]

    intent         = manager_agent.parse_intent(req.message)
    pipeline_steps = manager_agent.get_pipeline(intent)
    agent_name     = manager_agent.route(intent)

    base_task = AgentTask(
        task_id=task_id,
        agent_name=agent_name,
        intent=req.message,
        context={"intent": intent},
        token_budget=token_budget,
    )
    tools = ToolRegistry(db=db, user_id=user_id)

    if pipeline_steps:
        results = await workflow_engine.run_pipeline(
            steps=pipeline_steps, base_task=base_task,
            tools=tools, db=db, user_id=user_id,
        )
    else:
        result = await workflow_engine.run_single(
            agent_name=agent_name, task=base_task,
            tools=tools, db=db, user_id=user_id,
        )
        results = [result]

    return ChatResponse(
        task_id=task_id,
        intent=intent,
        pipeline=bool(pipeline_steps),
        agents_called=[r.agent_name for r in results],
        results=[
            AgentResultOut(
                task_id=r.task_id,
                agent_name=r.agent_name,
                status=r.status.value,
                output=r.output,
                tokens_used=r.tokens_used,
                latency_ms=r.latency_ms,
                error=r.error,
            )
            for r in results
        ],
        total_tokens=sum(r.tokens_used for r in results),
        total_latency_ms=sum(r.latency_ms for r in results),
    )


# ── Introspection ─────────────────────────────────────────────────────────────

@router.get("/intents")
def list_intents() -> dict:
    return {
        "intents":    manager_agent.describe(),
        "pipelines":  manager_agent.describe_pipelines(),
        "agents":     workflow_engine.list_agents(),
        "cache_stats": llm_cache.stats(),
    }


# ── Key usage ─────────────────────────────────────────────────────────────────

@router.get("/keys/usage")
def get_key_usage(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    """Daily token consumption per API key (hashed, no raw secrets exposed)."""
    return {
        "key_count": key_manager.key_count,
        "usage": key_manager.usage_report(db),
    }


# ── Logs ─────────────────────────────────────────────────────────────────────

@router.get("/logs")
def get_agent_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    return {"logs": AgentLogger.get_recent(db, current_user["user_id"], limit=limit)}


# ── Memory management ────────────────────────────────────────────────────────

@router.delete("/memory")
def clear_memory(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    AgentMemory(db, current_user["user_id"]).clear()
    return {"status": "memory cleared"}
