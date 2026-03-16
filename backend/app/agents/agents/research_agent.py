"""
ResearchAnalystAgent — deep-dive research and performance review agent.

Responsibilities:
  - Rank assets by return performance
  - Identify best/worst performers and diagnose causes
  - Suggest areas for deeper due-diligence

Typically called for 'performance_review' intent.
Can be chained after PortfolioAnalystAgent in a pipeline.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.agents.core.base import AgentResult, AgentStatus, AgentTask, BaseAgent
from app.agents.core.llm_client import LLMClient, LLMError
from app.agents.tools.tools import ToolRegistry

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a financial research analyst for a retail investment platform.
Rules:
1. Reply ONLY with a valid JSON object — no markdown, no extra text.
2. Use the exact schema described in the user message.
3. Be concise; total output must stay within the token budget.
4. Base insights only on the data provided; never invent returns or news.
5. Respond in the same language as the user's question (EN or ZH)."""


def _build_research_prompt(data: Dict) -> str:
    analytics = data.get("analytics", {})
    assets = analytics.get("assets", [])[:5]
    port = data.get("portfolio", {})
    cashflow = data.get("cashflow", {})
    return f"""Perform a performance research review and reply with:
{{"performance_grade": "A|B|C|D|F",
  "top_performers": [{{"name": "<name>", "return_pct": <float>, "note": "<1 sentence>"}}],
  "underperformers": [{{"name": "<name>", "return_pct": <float>, "note": "<1 sentence>"}}],
  "due_diligence_flags": ["<asset name: reason>"],
  "cashflow_comment": "<1 sentence on inflow/outflow pattern>",
  "overall_verdict": "<2 sentence performance verdict>"}}

Portfolio PnL: {port.get('pnl_pct', 0):.1f}% (total {port.get('pnl_amount', 0):.2f})
Top 5 assets by return: {assets}
Cashflow: inflow={cashflow.get('inflow', 0):.2f} outflow={cashflow.get('outflow', 0):.2f} net={cashflow.get('net', 0):.2f}

User question: {data.get('question', 'How are my investments performing?')}"""


class ResearchAnalystAgent(BaseAgent):
    name = "research_analyst"
    description = "Performance ranking, best/worst analysis, and due-diligence flags."

    def __init__(self) -> None:
        self._llm = LLMClient()

    async def run(self, task: AgentTask, tools: ToolRegistry) -> AgentResult:
        data: Dict[str, Any] = {"question": task.intent}
        try:
            data["portfolio"] = tools.get_portfolio_snapshot()
            data["analytics"] = tools.get_analytics_snapshot()
            data["cashflow"]  = tools.get_cashflow_snapshot()
        except Exception as exc:
            log.warning("ResearchAnalystAgent tool error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=f"Tool error: {exc}",
            )

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_research_prompt(data)},
        ]

        try:
            output, tokens = await self._llm.complete(messages, max_tokens=task.token_budget, db=tools._db)
        except LLMError as exc:
            log.error("ResearchAnalystAgent LLM error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=str(exc),
            )

        return AgentResult(
            task_id=task.task_id, agent_name=self.name,
            status=AgentStatus.DONE,
            output={**output, "intent": "performance_review"},
            tokens_used=tokens,
        )
