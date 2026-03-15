"""
ManagerAgent — intent parsing and workflow routing.

intent → manager → workflow → agents

The manager does NOT call the LLM. It uses keyword scoring to classify
the user's intent and select the appropriate agent graph — zero token cost.
"""
from __future__ import annotations

from typing import Dict, List, Tuple

# ── Intent taxonomy ───────────────────────────────────────────────────────────
# Each intent maps to: (keywords_en, keywords_zh)
INTENT_KEYWORDS: Dict[str, Tuple[List[str], List[str]]] = {
    "portfolio_overview": (
        ["portfolio", "overview", "summary", "holdings", "allocation", "composition", "worth"],
        ["组合", "持仓", "概览", "总结", "配置", "价值"],
    ),
    "risk_analysis": (
        ["risk", "volatile", "volatility", "drawdown", "safe", "danger", "loss", "exposure"],
        ["风险", "波动", "回撤", "安全", "危险", "亏损", "敞口"],
    ),
    "performance_review": (
        ["performance", "return", "profit", "loss", "pnl", "gain", "yield", "beat"],
        ["收益", "回报", "盈亏", "利润", "涨跌", "表现", "跑赢"],
    ),
    "rebalance_advice": (
        ["rebalance", "realloc", "adjust", "overweight", "underweight", "diversify"],
        ["再平衡", "调仓", "调整", "超配", "低配", "分散"],
    ),
    "goal_tracking": (
        ["goal", "target", "plan", "deadline", "progress", "achieve", "milestone"],
        ["目标", "计划", "期限", "进度", "实现", "里程碑"],
    ),
}

# ── Agent routing table ───────────────────────────────────────────────────────
# intent → agent_name
INTENT_TO_AGENT: Dict[str, str] = {
    "portfolio_overview":  "portfolio_analyst",
    "risk_analysis":       "portfolio_analyst",   # reuse; extend per sprint
    "performance_review":  "portfolio_analyst",
    "rebalance_advice":    "portfolio_analyst",
    "goal_tracking":       "portfolio_analyst",
    "unknown":             "portfolio_analyst",   # graceful fallback
}


class ManagerAgent:
    """
    Stateless router.  parse_intent() is O(n·k) keyword scan — no API call.
    """

    def parse_intent(self, text: str) -> str:
        lower = text.lower()
        scores: Dict[str, int] = {}
        for intent, (en_kws, zh_kws) in INTENT_KEYWORDS.items():
            scores[intent] = sum(1 for kw in en_kws + zh_kws if kw in lower)
        best_intent = max(scores, key=lambda k: scores[k])
        return best_intent if scores[best_intent] > 0 else "unknown"

    def route(self, intent: str) -> str:
        """Returns agent_name for the given intent."""
        return INTENT_TO_AGENT.get(intent, INTENT_TO_AGENT["unknown"])

    def describe(self) -> Dict[str, str]:
        """Introspection endpoint — lists all supported intents."""
        return {intent: INTENT_TO_AGENT[intent] for intent in INTENT_KEYWORDS}


# ── singleton ─────────────────────────────────────────────────────────────────
manager_agent = ManagerAgent()
