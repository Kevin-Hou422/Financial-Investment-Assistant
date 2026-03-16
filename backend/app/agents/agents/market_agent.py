"""
MarketAnalystAgent — real-time market context analysis agent.

Responsibilities:
  - Summarise watchlist performance vs market
  - Identify market trends relevant to user's holdings
  - Flag alert conditions on tracked assets

Data source: ToolRegistry (watchlist, alerts — no external API calls here).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.agents.core.base import AgentResult, AgentStatus, AgentTask, BaseAgent
from app.agents.core.llm_client import LLMClient, LLMError
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
    watchlist = data.get("watchlist", [])[:8]   # cap at 8 items
    alerts = data.get("alerts", [])[:5]
    port = data.get("portfolio", {})
    return f"""Analyze the market context for this user and reply with:
{{"market_sentiment": "bullish|neutral|bearish",
  "watchlist_highlights": [{{"symbol": "<name>", "observation": "<1 sentence>"}}],
  "active_alerts": ["<alert description>"],
  "opportunities": ["<up to 2 opportunities>"],
  "risks_from_market": ["<up to 2 market-level risks>"],
  "summary": "<2 sentence market context>"}}

Portfolio type allocation: {port.get('type_allocation', {})}
Watchlist items: {watchlist}
Active alerts: {alerts}

User question: {data.get('question', 'What is the current market situation for my portfolio?')}"""


class MarketAnalystAgent(BaseAgent):
    name = "market_analyst"
    description = "Market trends, watchlist monitoring, and alert context analysis."

    def __init__(self) -> None:
        self._llm = LLMClient()

    async def run(self, task: AgentTask, tools: ToolRegistry) -> AgentResult:
        data: Dict[str, Any] = {"question": task.intent}
        try:
            data["portfolio"] = tools.get_portfolio_snapshot()
            data["watchlist"] = tools.get_raw_watchlist()
            data["alerts"]    = tools.get_raw_alerts()
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
            output, tokens = await self._llm.complete(messages, max_tokens=task.token_budget)
        except LLMError as exc:
            log.error("MarketAnalystAgent LLM error: %s", exc)
            return AgentResult(
                task_id=task.task_id, agent_name=self.name,
                status=AgentStatus.FAILED, error=str(exc),
            )

        return AgentResult(
            task_id=task.task_id, agent_name=self.name,
            status=AgentStatus.DONE,
            output={**output, "intent": "market_analysis"},
            tokens_used=tokens,
        )
