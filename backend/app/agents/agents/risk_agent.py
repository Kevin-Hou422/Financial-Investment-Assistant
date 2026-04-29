"""
RiskAnalystAgent — quantitative risk scoring, exposure analysis.

Changes vs original:
  - _gather_data() offloaded via asyncio.to_thread.
  - LLM output validated against RiskAnalysisOutput schema.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.agents.core.base import AgentResult, AgentStatus, AgentTask, BaseAgent
from app.agents.core.llm_client import LLMClient, LLMError
from app.agents.core.output_schemas import RiskAnalysisOutput, coerce_output
from app.agents.tools.tools import ToolRegistry

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a quantitative risk analyst for a retail investment platform.
Rules:
1. Reply ONLY with a valid JSON object — no markdown, no extra text.
2. Use the exact schema described in the user message.
3. Be concise and precise; total output must stay within the token budget.
4. Base insights strictly on the numbers provided; never fabricate data.
5. Respond in the same language as the user's question (EN or ZH)."""


def _build_risk_prompt(data: Dict) -> str:
    risk = data.get("risk", {})
    port = data.get("portfolio", {})
    return f"""Perform a detailed risk assessment and reply with:
{{"risk_score": <0-100>,
  "risk_level": "low|medium|high|critical",
  "top_risks": [{{"factor": "<name>", "severity": "low|medium|high", "detail": "<1 sentence>"}}],
  "concentration_warning": "<null or asset name if >40% single position>",
  "recommended_actions": ["<up to 3 specific actions>"],
  "summary": "<2 sentence risk summary>"}}

Portfolio snapshot:
  Total value: {port.get('total_value', 0):.2f}
  Asset count: {port.get('asset_count', 0)}
  Type allocation %: {port.get('type_allocation', {})}

Risk metrics:
{risk}

User question: {data.get('question', 'Analyze my portfolio risk.')}"""


class RiskAnalystAgent(BaseAgent):
    name = "risk_analyst"
    description = "Quantitative risk scoring, exposure analysis, and risk reduction advice."

    def __init__(self) -> None:
        self._llm = LLMClient()

    def _gather_data(self, task: AgentTask, tools: ToolRegistry) -> Dict[str, Any]:
        data: Dict[str, Any] = {"question": task.intent}
        data["portfolio"] = tools.get_portfolio_snapshot()
        data["risk"] = tools.get_risk_snapshot()
        # Consume upstream portfolio_analyst output if running in pipeline
        upstream = task.context.get("portfolio_analyst_output", {})
        if upstream:
            data["portfolio_analysis"] = upstream
        return data

    async def run(self, task: AgentTask, tools: ToolRegistry) -> AgentResult:
        try:
            data = await asyncio.to_thread(self._gather_data, task, tools)
        except Exception as exc:
            log.warning("RiskAnalystAgent tool error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=f"Tool error: {exc}",
            )

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_risk_prompt(data)},
        ]

        try:
            raw_output, tokens = await self._llm.complete(
                messages, max_tokens=task.token_budget, db=tools._db
            )
        except LLMError as exc:
            log.error("RiskAnalystAgent LLM error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=str(exc),
            )

        output = coerce_output(raw_output, RiskAnalysisOutput)

        return AgentResult(
            task_id=task.task_id, agent_name=self.name,
            status=AgentStatus.DONE,
            output={**output, "intent": "risk_analysis"},
            tokens_used=tokens,
        )
