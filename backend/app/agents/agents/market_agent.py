"""
MarketAnalystAgent — live market quotes, watchlist, alerts, sentiment.

Changes vs original:
  - _gather_data() offloaded via asyncio.to_thread.
  - LLM output validated against MarketAnalysisOutput schema.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

from app.agents.core.base import AgentResult, AgentStatus, AgentTask, BaseAgent
from app.agents.core.llm_client import LLMClient, LLMError
from app.agents.core.output_schemas import MarketAnalysisOutput, coerce_output
from app.agents.tools.tools import ToolRegistry

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a market analyst assistant for a retail investment platform.
Rules:
1. Reply ONLY with a valid JSON object — no markdown, no extra text.
2. Use the exact schema described in the user message.
3. Be concise; total output must stay within the token budget.
4. Base insights only on the data provided; never invent prices or news.
5. Respond in the same language as the user's question (EN or ZH)."""


def _build_market_prompt(data: Dict) -> str:
    watchlist = data.get("watchlist", [])[:8]
    alerts    = data.get("alerts",    [])[:5]
    port      = data.get("portfolio", {})
    quotes    = data.get("market", {}).get("quotes", [])[:6]
    return f"""Analyze the market context for this user and reply with:
{{"market_sentiment": "bullish|neutral|bearish",
  "live_quotes_summary": "<1 sentence on recent price action>",
  "watchlist_highlights": [{{"symbol": "<name>", "observation": "<1 sentence>"}}],
  "active_alerts": ["<alert description>"],
  "opportunities": ["<up to 2 opportunities>"],
  "risks_from_market": ["<up to 2 market-level risks>"],
  "summary": "<2 sentence market context>"}}

Portfolio type allocation: {port.get('type_allocation', {})}
Live quotes (up to 6): {quotes}
Watchlist items: {watchlist}
Active alerts: {alerts}

User question: {data.get('question', 'What is the current market situation for my portfolio?')}"""


class MarketAnalystAgent(BaseAgent):
    name = "market_analyst"
    description = "Live market quotes, watchlist monitoring, and alert context analysis."

    def __init__(self) -> None:
        self._llm = LLMClient()

    def _gather_data(self, task: AgentTask, tools: ToolRegistry) -> Dict[str, Any]:
        data: Dict[str, Any] = {"question": task.intent}
        data["portfolio"] = tools.get_portfolio_snapshot()
        data["watchlist"] = tools.get_raw_watchlist()
        data["alerts"]    = tools.get_raw_alerts()
        data["market"]    = tools.get_market_snapshot()
        return data

    async def run(self, task: AgentTask, tools: ToolRegistry) -> AgentResult:
        try:
            data = await asyncio.to_thread(self._gather_data, task, tools)
        except Exception as exc:
            log.warning("MarketAnalystAgent tool error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=f"Tool error: {exc}",
            )

        messages: List[Dict[str, str]] = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_market_prompt(data)},
        ]

        try:
            raw_output, tokens = await self._llm.complete(
                messages, max_tokens=task.token_budget, db=tools._db
            )
        except LLMError as exc:
            log.error("MarketAnalystAgent LLM error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=str(exc),
            )

        output = coerce_output(raw_output, MarketAnalysisOutput)

        return AgentResult(
            task_id=task.task_id, agent_name=self.name,
            status=AgentStatus.DONE,
            output={**output, "intent": "market_analysis"},
            tokens_used=tokens,
        )
