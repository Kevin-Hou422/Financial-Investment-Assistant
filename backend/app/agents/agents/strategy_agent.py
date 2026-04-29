"""
StrategyAnalystAgent — rebalancing plans and buy/sell/hold recommendations.

Typically runs after RiskAnalystAgent in a pipeline, consuming its output.

Changes vs original:
  - _gather_data() offloaded via asyncio.to_thread.
  - LLM output validated against StrategyOutput schema.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.agents.core.base import AgentResult, AgentStatus, AgentTask, BaseAgent
from app.agents.core.llm_client import LLMClient, LLMError
from app.agents.core.output_schemas import StrategyOutput, coerce_output
from app.agents.tools.tools import ToolRegistry

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an investment strategy advisor for a retail investment platform.
Rules:
1. Reply ONLY with a valid JSON object — no markdown, no extra text.
2. Use the exact schema described in the user message.
3. Be concise and actionable; total output must stay within the token budget.
4. Base every recommendation on the data provided; never fabricate asset prices.
5. Respond in the same language as the user's question (EN or ZH)."""


def _build_strategy_prompt(data: Dict) -> str:
    port     = data.get("portfolio", {})
    risk_out = data.get("risk_analyst_output", {})
    goals    = data.get("goals", [])[:5]
    cashflow = data.get("cashflow", {})
    return f"""Develop an investment strategy plan and reply with:
{{"strategy_type": "conservative|balanced|aggressive",
  "rebalance_actions": [
    {{"action": "buy|sell|hold", "asset_type": "<type>", "reason": "<1 sentence>"}}
  ],
  "target_allocation": {{"<asset_type>": <pct>}},
  "next_steps": ["<up to 3 prioritised action items>"],
  "rationale": "<2 sentence strategy rationale>"}}

Current allocation: {port.get('type_allocation', {})}
Portfolio PnL: {port.get('pnl_pct', 0):.1f}%
Risk assessment: {risk_out}
Financial goals: {goals}
Cashflow (net): {cashflow.get('net', 0):.2f}

User question: {data.get('question', 'How should I adjust my investment strategy?')}"""


class StrategyAnalystAgent(BaseAgent):
    name = "strategy_analyst"
    description = "Rebalancing plans, allocation targets, and buy/sell/hold recommendations."

    def __init__(self) -> None:
        self._llm = LLMClient()

    def _gather_data(self, task: AgentTask, tools: ToolRegistry) -> Dict[str, Any]:
        data: Dict[str, Any] = {"question": task.intent}
        data["portfolio"] = tools.get_portfolio_snapshot()
        data["goals"]     = tools.get_goals_snapshot()
        data["cashflow"]  = tools.get_cashflow_snapshot()
        # Consume upstream risk output if in pipeline
        data["risk_analyst_output"] = task.context.get("risk_analyst_output", {})
        return data

    async def run(self, task: AgentTask, tools: ToolRegistry) -> AgentResult:
        try:
            data = await asyncio.to_thread(self._gather_data, task, tools)
        except Exception as exc:
            log.warning("StrategyAnalystAgent tool error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=f"Tool error: {exc}",
            )

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_strategy_prompt(data)},
        ]

        try:
            raw_output, tokens = await self._llm.complete(
                messages, max_tokens=task.token_budget, db=tools._db
            )
        except LLMError as exc:
            log.error("StrategyAnalystAgent LLM error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=str(exc),
            )

        output = coerce_output(raw_output, StrategyOutput)

        return AgentResult(
            task_id=task.task_id, agent_name=self.name,
            status=AgentStatus.DONE,
            output={**output, "intent": "rebalance_advice"},
            tokens_used=tokens,
        )
