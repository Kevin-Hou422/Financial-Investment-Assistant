"""
WorkflowEngine — executes agent graphs.

Supports:
  • run_single    → single-agent task
  • run_pipeline  → sequential multi-agent chain (output of N feeds N+1)
  • run_parallel  → concurrent multi-agent fan-out (asyncio.gather)

Memory, logging, and cache are injected here so individual agents stay clean.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.agents.core.base import AgentResult, AgentStatus, AgentTask
from app.agents.tools.tools import ToolRegistry
from app.agents.core.memory import AgentMemory
from app.agents.core.logger import AgentLogger

log = logging.getLogger(__name__)


class WorkflowEngine:
    """
    Lazy-loads agents to avoid circular imports at module load time.
    """

    def __init__(self) -> None:
        self._registry: Optional[Dict[str, Any]] = None

    def _get_registry(self) -> Dict[str, Any]:
        if self._registry is None:
            from app.agents.agents.portfolio_agent import PortfolioAnalystAgent
            from app.agents.agents.risk_agent      import RiskAnalystAgent
            from app.agents.agents.market_agent    import MarketAnalystAgent
            from app.agents.agents.strategy_agent  import StrategyAnalystAgent
            from app.agents.agents.research_agent  import ResearchAnalystAgent
            self._registry = {
                "portfolio_analyst": PortfolioAnalystAgent(),
                "risk_analyst":      RiskAnalystAgent(),
                "market_analyst":    MarketAnalystAgent(),
                "strategy_analyst":  StrategyAnalystAgent(),
                "research_analyst":  ResearchAnalystAgent(),
            }
        return self._registry

    # ── helpers ───────────────────────────────────────────────────────────────

    def _make_logger(self, db: Optional[Session], user_id: str) -> Optional[AgentLogger]:
        if db is None:
            return None
        try:
            return AgentLogger(db, user_id)
        except Exception:
            return None

    def _make_memory(self, db: Optional[Session], user_id: str) -> Optional[AgentMemory]:
        if db is None:
            return None
        try:
            return AgentMemory(db, user_id)
        except Exception:
            return None

    # ── public API ────────────────────────────────────────────────────────────

    async def run_single(
        self,
        agent_name: str,
        task: AgentTask,
        tools: ToolRegistry,
        db: Optional[Session] = None,
        user_id: str = "",
    ) -> AgentResult:
        """Dispatch a single task to one agent, with logging."""
        registry = self._get_registry()
        agent = registry.get(agent_name)
        if agent is None:
            return AgentResult(
                task_id=task.task_id, agent_name=agent_name,
                status=AgentStatus.FAILED,
                error=f"Agent '{agent_name}' not registered.",
            )

        # Inject memory context into task
        memory = self._make_memory(db, user_id)
        if memory:
            history = memory.load()
            if history:
                task.context["conversation_history"] = history

        t0 = time.monotonic()
        log.info("WorkflowEngine → %s | budget=%d tokens", agent_name, task.token_budget)
        result = await agent.run(task, tools)
        result.latency_ms = int((time.monotonic() - t0) * 1000)
        log.info(
            "WorkflowEngine ← %s | status=%s tokens=%d latency=%dms",
            agent_name, result.status, result.tokens_used, result.latency_ms,
        )

        # Persist memory turn
        if memory and result.status == AgentStatus.DONE:
            memory.save("user", task.intent)
            reply = result.output.get("summary") or result.output.get("overall_verdict", "")
            if reply:
                memory.save("assistant", str(reply)[:500])

        # Structured log
        agent_logger = self._make_logger(db, user_id)
        if agent_logger:
            agent_logger.record(result, intent=task.context.get("intent", ""))

        return result

    async def run_pipeline(
        self,
        steps: List[Dict],
        base_task: AgentTask,
        tools: ToolRegistry,
        db: Optional[Session] = None,
        user_id: str = "",
    ) -> List[AgentResult]:
        """
        Sequential pipeline: each step receives the previous result in context.
        Stops on first failure.
        """
        results: List[AgentResult] = []
        ctx = dict(base_task.context)
        agent_logger = self._make_logger(db, user_id)

        # Load memory once and inject into first step
        memory = self._make_memory(db, user_id)
        if memory:
            ctx["conversation_history"] = memory.load()

        for step in steps:
            task = AgentTask(
                task_id=f"{base_task.task_id}_{step['agent']}",
                agent_name=step["agent"],
                intent=base_task.intent,
                context=ctx,
                token_budget=step.get("token_budget", base_task.token_budget),
            )
            result = await self.run_single(step["agent"], task, tools)
            results.append(result)

            if agent_logger:
                agent_logger.record(result, intent=ctx.get("intent", ""))

            if result.status == AgentStatus.FAILED:
                log.warning("Pipeline aborted at step '%s': %s", step["agent"], result.error)
                break

            # Pass output forward as context for next step
            ctx = {**ctx, f"{step['agent']}_output": result.output}

        # Save memory after pipeline completes
        if memory:
            memory.save("user", base_task.intent)
            last_ok = next((r for r in reversed(results) if r.status == AgentStatus.DONE), None)
            if last_ok:
                summary = (
                    last_ok.output.get("summary")
                    or last_ok.output.get("rationale")
                    or last_ok.output.get("overall_verdict", "")
                )
                if summary:
                    memory.save("assistant", str(summary)[:500])

        return results

    async def run_parallel(
        self,
        agent_names: List[str],
        base_task: AgentTask,
        tools: ToolRegistry,
        token_budget_each: int = 400,
        db: Optional[Session] = None,
        user_id: str = "",
    ) -> List[AgentResult]:
        """
        Fan-out: run multiple agents concurrently on the same task.
        Useful for generating independent analyses simultaneously.
        """
        registry = self._get_registry()
        agent_logger = self._make_logger(db, user_id)

        async def _run_one(name: str) -> AgentResult:
            agent = registry.get(name)
            if agent is None:
                return AgentResult(
                    task_id=base_task.task_id, agent_name=name,
                    status=AgentStatus.FAILED, error=f"Agent '{name}' not registered.",
                )
            task = AgentTask(
                task_id=f"{base_task.task_id}_{name}",
                agent_name=name,
                intent=base_task.intent,
                context=dict(base_task.context),
                token_budget=token_budget_each,
            )
            t0 = time.monotonic()
            result = await agent.run(task, tools)
            result.latency_ms = int((time.monotonic() - t0) * 1000)
            if agent_logger:
                agent_logger.record(result, intent=base_task.context.get("intent", ""))
            return result

        return list(await asyncio.gather(*[_run_one(n) for n in agent_names]))

    def list_agents(self) -> List[str]:
        return list(self._get_registry().keys())


# ── singleton ─────────────────────────────────────────────────────────────────
workflow_engine = WorkflowEngine()
