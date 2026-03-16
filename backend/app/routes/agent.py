"""
Agent routes.

  GET  /agent/analyze_portfolio  — legacy placeholder
  GET  /agent/recommend_assets   — legacy placeholder
  GET  /agent/risk_analysis      — legacy placeholder
  POST /agent/chat               — auto-dispatch: single agent or multi-agent pipeline
  GET  /agent/intents            — list intents, pipelines, registered agents
  GET  /agent/logs               — recent agent call logs for current user
  DELETE /agent/memory           — clear conversation memory for current user
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.interfaces.agent_portfolio_interface import get_current_portfolio
from app.interfaces.agent_market_interface import get_market_snapshot
from app.interfaces.agent_risk_interface import get_risk_metrics
from app.utils.auth_utils import get_current_user
from app.agents.core.manager import manager_agent
from app.agents.workflows.workflow import workflow_engine
from app.agents.tools.tools import ToolRegistry
from app.agents.core.base import AgentTask, AgentStatus
from app.agents.core.memory import AgentMemory
from app.agents.core.logger import AgentLogger
from app.agents.core.cache import llm_cache

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
      Memory, logging, and cache are handled inside the workflow engine.
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="message must not be empty")

    user_id = current_user["user_id"]
    token_budget = max(100, min(req.token_budget or 600, 1500))
    task_id = str(uuid.uuid4())[:8]

    # 1 + 2: intent + routing (no LLM cost)
    intent = manager_agent.parse_intent(req.message)
    pipeline_steps = manager_agent.get_pipeline(intent)
    agent_name = manager_agent.route(intent)

    base_task = AgentTask(
        task_id=task_id,
        agent_name=agent_name,
        intent=req.message,
        context={"intent": intent},
        token_budget=token_budget,
    )

    tools = ToolRegistry(db=db, user_id=user_id)

    # 3a: multi-agent pipeline
    if pipeline_steps:
        results = await workflow_engine.run_pipeline(
            steps=pipeline_steps,
            base_task=base_task,
            tools=tools,
            db=db,
            user_id=user_id,
        )
    else:
        # 3b: single agent
        result = await workflow_engine.run_single(
            agent_name=agent_name,
            task=base_task,
            tools=tools,
            db=db,
            user_id=user_id,
        )
        results = [result]

    agents_called = [r.agent_name for r in results]
    total_tokens = sum(r.tokens_used for r in results)
    total_latency = sum(r.latency_ms for r in results)

    return ChatResponse(
        task_id=task_id,
        intent=intent,
        pipeline=bool(pipeline_steps),
        agents_called=agents_called,
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
        total_tokens=total_tokens,
        total_latency_ms=total_latency,
    )


# ── Introspection ─────────────────────────────────────────────────────────────

@router.get("/intents")
def list_intents() -> dict:
    return {
        "intents": manager_agent.describe(),
        "pipelines": manager_agent.describe_pipelines(),
        "agents": workflow_engine.list_agents(),
        "cache_stats": llm_cache.stats(),
    }


# ── Logs ─────────────────────────────────────────────────────────────────────

@router.get("/logs")
def get_agent_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    """Return recent agent call logs for the current user."""
    logs = AgentLogger.get_recent(db, current_user["user_id"], limit=limit)
    return {"logs": logs}


# ── Memory management ────────────────────────────────────────────────────────

@router.delete("/memory")
def clear_memory(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> dict:
    """Clear conversation memory for the current user."""
    AgentMemory(db, current_user["user_id"]).clear()
    return {"status": "memory cleared"}
