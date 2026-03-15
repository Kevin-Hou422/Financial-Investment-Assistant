"""
PortfolioAnalystAgent — example agent implementation.

Workflow position: intent → manager → workflow → [this agent]

Capabilities:
  - portfolio_overview : summarise holdings, allocation, PnL
  - risk_analysis      : volatility, drawdown, concentration flags
  - performance_review : per-asset return ranking, best/worst
  - rebalance_advice   : over/under-weight suggestions
  - goal_tracking      : progress toward financial goals

Token budget: default 600 per call. Prompts are templated to stay under 300
input tokens so the model has at least 300 tokens for its reply.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from backend.app.agents.core.base import AgentResult, AgentStatus, AgentTask, BaseAgent
from backend.app.agents.core.llm_client import LLMClient, LLMError
from backend.app.agents.tools.tools import ToolRegistry

log = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# System prompt (shared across all sub-intents)
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI portfolio analyst for a retail investment assistant.
Rules:
1. Reply ONLY with a JSON object — no markdown, no extra text.
2. Use the exact JSON schema described in each user message.
3. Be concise. Total output must stay under the token budget.
4. Base every insight strictly on the data provided; never invent prices.
5. Respond in the same language as the user's question (EN or ZH)."""

# ──────────────────────────────────────────────────────────────────────────────
# Per-intent prompt builders
# Each builder receives a compact data dict and returns a user-turn string.
# They deliberately omit raw numbers > 5 items to minimise input token usage.
# ──────────────────────────────────────────────────────────────────────────────

def _build_portfolio_prompt(data: Dict) -> str:
    snap = data.get("portfolio", {})
    return f"""Analyze this portfolio snapshot and reply with:
{{"summary": "<2-3 sentence overview>",
  "highlights": ["<up to 3 key observations>"],
  "allocation_comment": "<1 sentence on diversification>"}}

Data:
Total value: {snap.get('total_value', 0):.2f}
PnL: {snap.get('pnl_amount', 0):.2f} ({snap.get('pnl_pct', 0):.1f}%)
Asset count: {snap.get('asset_count', 0)}
Type allocation %: {snap.get('type_allocation', {})}
Top 5 holdings: {snap.get('top_holdings', [])}

User question: {data.get('question', 'Give me a portfolio overview.')}"""


def _build_risk_prompt(data: Dict) -> str:
    risk = data.get("risk", {})
    return f"""Assess the portfolio risk and reply with:
{{"risk_level": "low|medium|high",
  "key_risks": ["<up to 3 specific risks>"],
  "recommendation": "<1 actionable sentence>"}}

Risk metrics:
{risk}

User question: {data.get('question', 'What are my main risk factors?')}"""


def _build_performance_prompt(data: Dict) -> str:
    perf = data.get("analytics", {})
    return f"""Review portfolio performance and reply with:
{{"best_performer": "<name and return%>",
  "worst_performer": "<name and return%>",
  "overall_assessment": "<2 sentence evaluation>",
  "action_hint": "<1 sentence suggestion>"}}

Performance data (top 5 by return):
{perf.get('assets', [])}

User question: {data.get('question', 'How is my portfolio performing?')}"""


def _build_rebalance_prompt(data: Dict) -> str:
    snap = data.get("portfolio", {})
    risk = data.get("risk", {})
    return f"""Suggest portfolio rebalancing actions and reply with:
{{"overweight": ["<asset type or name>"],
  "underweight": ["<asset type or name>"],
  "actions": ["<up to 3 concrete steps>"],
  "rationale": "<1 sentence>"}}

Type allocation %: {snap.get('type_allocation', {})}
Concentration metrics: {risk}

User question: {data.get('question', 'Should I rebalance my portfolio?')}"""


def _build_goal_prompt(data: Dict) -> str:
    goals = data.get("goals", [])
    return f"""Evaluate goal progress and reply with:
{{"on_track": <true|false>,
  "at_risk_goals": ["<goal name>"],
  "suggestions": ["<up to 3 suggestions>"],
  "summary": "<1 sentence>"}}

Goals progress:
{goals}

User question: {data.get('question', 'Am I on track for my financial goals?')}"""


# ──────────────────────────────────────────────────────────────────────────────
# Prompt dispatcher
# ──────────────────────────────────────────────────────────────────────────────

PROMPT_BUILDERS = {
    "portfolio_overview":  _build_portfolio_prompt,
    "risk_analysis":       _build_risk_prompt,
    "performance_review":  _build_performance_prompt,
    "rebalance_advice":    _build_rebalance_prompt,
    "goal_tracking":       _build_goal_prompt,
}


# ──────────────────────────────────────────────────────────────────────────────
# Agent
# ──────────────────────────────────────────────────────────────────────────────

class PortfolioAnalystAgent(BaseAgent):
    """
    Single-agent that handles all portfolio-related intents.
    Extend by adding more prompt builders and registering them in PROMPT_BUILDERS.
    """
    name = "portfolio_analyst"
    description = "Analyses portfolio structure, risk, performance, and goals."

    def __init__(self) -> None:
        self._llm = LLMClient()

    async def run(self, task: AgentTask, tools: ToolRegistry) -> AgentResult:
        intent = task.context.get("intent", task.intent)

        # ── 1. gather data via tools (no LLM calls) ───────────────────────────
        data: Dict[str, Any] = {"question": task.intent}
        try:
            data["portfolio"] = tools.get_portfolio_snapshot()
            if intent in ("risk_analysis", "rebalance_advice"):
                data["risk"] = tools.get_risk_snapshot()
            if intent == "performance_review":
                data["analytics"] = tools.get_analytics_snapshot()
            if intent == "goal_tracking":
                data["goals"] = tools.get_goals_snapshot()
        except Exception as exc:
            log.warning("PortfolioAnalystAgent: tool error — %s", exc)
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.name,
                status=AgentStatus.FAILED,
                error=f"Tool layer error: {exc}",
            )

        # ── 2. build prompt ───────────────────────────────────────────────────
        builder = PROMPT_BUILDERS.get(intent, _build_portfolio_prompt)
        user_msg = builder(data)

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ]

        # ── 3. call LLM ───────────────────────────────────────────────────────
        try:
            output, tokens = await self._llm.complete(
                messages, max_tokens=task.token_budget
            )
        except LLMError as exc:
            log.error("PortfolioAnalystAgent LLM error: %s", exc)
            return AgentResult(
                task_id=task.task_id,
                agent_name=self.name,
                status=AgentStatus.FAILED,
                error=str(exc),
                output={"raw_data": data},
            )

        return AgentResult(
            task_id=task.task_id,
            agent_name=self.name,
            status=AgentStatus.DONE,
            output={**output, "intent": intent, "data_snapshot": data},
            tokens_used=tokens,
        )
