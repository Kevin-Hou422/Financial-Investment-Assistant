"""
ManagerAgent — intent parsing and workflow routing.

intent → manager → workflow → agents

The manager does NOT call the LLM. It uses keyword scoring to classify
the user's intent and select the appropriate agent graph — zero token cost.

Multi-agent pipelines are defined here: complex intents dispatch a sequence
of agents where each agent's output feeds the next.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

# ── Intent taxonomy ───────────────────────────────────────────────────────────
INTENT_KEYWORDS: Dict[str, Tuple[List[str], List[str]]] = {
    "portfolio_overview": (
        ["portfolio", "overview", "summary", "holdings", "allocation", "composition", "worth"],
        ["组合", "持仓", "概览", "总结", "配置", "价值", "资产"],
    ),
    "risk_analysis": (
        ["risk", "volatile", "volatility", "drawdown", "safe", "danger", "loss", "exposure", "hedge"],
        ["风险", "波动", "回撤", "安全", "危险", "亏损", "敞口", "对冲"],
    ),
    "performance_review": (
        ["performance", "return", "profit", "pnl", "gain", "yield", "beat", "benchmark"],
        ["收益", "回报", "盈亏", "利润", "涨跌", "表现", "跑赢", "业绩"],
    ),
    "rebalance_advice": (
        ["rebalance", "realloc", "adjust", "overweight", "underweight", "diversify", "strategy"],
        ["再平衡", "调仓", "调整", "超配", "低配", "分散", "策略", "配置"],
    ),
    "goal_tracking": (
        ["goal", "target", "plan", "deadline", "progress", "achieve", "milestone", "saving"],
        ["目标", "计划", "期限", "进度", "实现", "里程碑", "储蓄", "存钱"],
    ),
    "market_analysis": (
        ["market", "watchlist", "trend", "sector", "news", "sentiment", "macro"],
        ["市场", "自选股", "趋势", "板块", "行情", "情绪", "宏观"],
    ),
    "research": (
        ["research", "analyse", "analyze", "deep", "due diligence", "compare", "study"],
        ["研究", "分析", "深度", "尽调", "比较", "调研"],
    ),
    "full_report": (
        ["full", "complete", "comprehensive", "report", "everything", "all"],
        ["完整", "全面", "综合", "报告", "全部", "所有"],
    ),
}

# ── Single-agent routing ───────────────────────────────────────────────────────
# Simple intents → one specialist agent
INTENT_TO_AGENT: Dict[str, str] = {
    "portfolio_overview": "portfolio_analyst",
    "risk_analysis":      "risk_analyst",
    "performance_review": "research_analyst",
    "rebalance_advice":   "strategy_analyst",
    "goal_tracking":      "portfolio_analyst",
    "market_analysis":    "market_analyst",
    "research":           "research_analyst",
    "full_report":        "portfolio_analyst",   # overridden to pipeline below
    "unknown":            "portfolio_analyst",
}

# ── Multi-agent pipelines ─────────────────────────────────────────────────────
# Complex intents dispatch an ordered list of agents.
# Each step: {"agent": name, "token_budget": N}
INTENT_TO_PIPELINE: Dict[str, List[Dict]] = {
    # Full report: portfolio + risk in parallel (independent), then strategy consumes both
    "full_report": [
        {"parallel": [
            {"agent": "portfolio_analyst", "token_budget": 500},
            {"agent": "risk_analyst",      "token_budget": 400},
        ]},
        {"agent": "strategy_analyst", "token_budget": 400},
    ],
    # Rebalance: risk first, then strategy builds on it
    "rebalance_advice": [
        {"agent": "risk_analyst",     "token_budget": 350},
        {"agent": "strategy_analyst", "token_budget": 450},
    ],
    # Performance deep-dive: portfolio overview + research
    "performance_review": [
        {"agent": "portfolio_analyst", "token_budget": 400},
        {"agent": "research_analyst",  "token_budget": 450},
    ],
}


class ManagerAgent:
    """
    Stateless router.  parse_intent() is O(n·k) keyword scan — zero API cost.
    """

    def parse_intent(self, text: str) -> str:
        lower = text.lower()
        scores: Dict[str, int] = {}
        for intent, (en_kws, zh_kws) in INTENT_KEYWORDS.items():
            scores[intent] = sum(1 for kw in en_kws + zh_kws if kw in lower)
        best_intent = max(scores, key=lambda k: scores[k])
        return best_intent if scores[best_intent] > 0 else "unknown"

    def route(self, intent: str) -> str:
        """Returns the primary agent_name for single-agent dispatch."""
        return INTENT_TO_AGENT.get(intent, INTENT_TO_AGENT["unknown"])

    def get_pipeline(self, intent: str) -> Optional[List[Dict]]:
        """
        Returns a pipeline definition if the intent maps to multi-agent flow,
        else None (caller should use route() for single-agent dispatch).
        """
        return INTENT_TO_PIPELINE.get(intent)

    def describe(self) -> Dict[str, str]:
        return {intent: INTENT_TO_AGENT[intent] for intent in INTENT_KEYWORDS}

    def describe_pipelines(self) -> Dict[str, List]:
        """Return human-readable pipeline shape (supports parallel groups)."""
        result = {}
        for intent, steps in INTENT_TO_PIPELINE.items():
            described = []
            for step in steps:
                if "parallel" in step:
                    described.append({"parallel": [s["agent"] for s in step["parallel"]]})
                else:
                    described.append(step["agent"])
            result[intent] = described
        return result


# ── singleton ─────────────────────────────────────────────────────────────────
manager_agent = ManagerAgent()
