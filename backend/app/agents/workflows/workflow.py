"""
WorkflowEngine — executes agent graphs.

Currently supports:
  • run_single  → sequential single-agent task
  • run_pipeline → sequential multi-agent chain (output of N feeds into N+1)

Extend with run_parallel() when more agents are added.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List

from backend.app.agents.core.base import AgentResult, AgentStatus, AgentTask
from backend.app.agents.tools.tools import ToolRegistry

log = logging.getLogger(__name__)


class WorkflowEngine:
    """
    Lazy-loads agents to avoid circular imports.
    Registry is populated on first use.
    """

    def __init__(self) -> None:
        self._registry: Dict[str, any] | None = None

    def _get_registry(self) -> Dict[str, any]:
        if self._registry is None:
            # Import here to avoid circular deps at module load
            from backend.app.agents.agents.portfolio_analyst import PortfolioAnalystAgent
            self._registry = {
                "portfolio_analyst": PortfolioAnalystAgent(),
            }
        return self._registry

    # ── public API ────────────────────────────────────────────────────────────

    async def run_single(
        self,
        agent_name: str,
        task: AgentTask,
        tools: ToolRegistry,
    ) -> AgentResult:
        """Dispatch a single task to one agent."""
        registry = self._get_registry()
        agent = registry.get(agent_name)
        if agent is None:
            return AgentResult(
                task_id=task.task_id,
                agent_name=agent_name,
                status=AgentStatus.FAILED,
                error=f"Agent '{agent_name}' not registered.",
            )
        t0 = time.monotonic()
        log.info("WorkflowEngine → %s | budget=%d tokens", agent_name, task.token_budget)
        result = await agent.run(task, tools)
        result.latency_ms = int((time.monotonic() - t0) * 1000)
        log.info(
            "WorkflowEngine ← %s | status=%s tokens=%d latency=%dms",
            agent_name, result.status, result.tokens_used, result.latency_ms,
        )
        return result

    async def run_pipeline(
        self,
        steps: List[Dict],  # [{"agent": "...", "token_budget": N}, ...]
        base_task: AgentTask,
        tools: ToolRegistry,
    ) -> List[AgentResult]:
        """
        Sequential pipeline: each step receives the previous result in context.
        Stops on first failure.
        """
        results: List[AgentResult] = []
        ctx = dict(base_task.context)
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
            if result.status == AgentStatus.FAILED:
                log.warning("Pipeline aborted at step '%s': %s", step["agent"], result.error)
                break
            # Carry forward output as context for next step
            ctx = {**ctx, f"{step['agent']}_output": result.output}
        return results

    def list_agents(self) -> List[str]:
        return list(self._get_registry().keys())


# ── singleton ─────────────────────────────────────────────────────────────────
workflow_engine = WorkflowEngine()
