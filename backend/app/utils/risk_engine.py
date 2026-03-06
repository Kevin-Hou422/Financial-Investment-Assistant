from typing import Any, Dict, List

import numpy as np


def calculate_volatility(returns_list: List[float]) -> float:
    """计算年化波动率"""
    if len(returns_list) < 2:
        return 0.0
    return float(np.std(returns_list) * np.sqrt(252))


def calculate_max_drawdown(value_history: List[float]) -> float:
    """计算最大回撤"""
    if not value_history:
        return 0.0
    values = np.array(value_history)
    peak = np.maximum.accumulate(values)
    drawdown = (peak - values) / peak
    return float(np.max(drawdown))


def estimate_portfolio_risk(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    基于当前资产配置估算组合风险水平。

    在缺乏完整历史净值曲线的情况下，采用「资产类型配置 + 经验波动率假设」估算组合波动率和最大回撤：

    - Stock: 18% 年化波动率
    - Fund: 12%
    - Crypto: 60%
    - Gold: 10%

    组合波动率约为各类型波动率按权重加权的 RMS。
    最大回撤粗略估算为 2.5 倍波动率（用于风险分级）。
    """
    from app.utils.allocation_engine import (
        build_allocation_metrics,
    )  # 本地导入避免潜在循环依赖

    metrics = build_allocation_metrics(assets)
    type_alloc = metrics["type_allocation"]

    # 年化波动率假设
    vol_assumptions = {
        "Stock": 0.18,
        "Fund": 0.12,
        "Crypto": 0.60,
        "Gold": 0.10,
    }

    # 组合波动率：加权 RMS
    portfolio_var = 0.0
    for item in type_alloc:
        t = item["type"]
        w = item["weight_pct"] / 100.0
        vol = vol_assumptions.get(t, 0.18)
        portfolio_var += (w * vol) ** 2

    portfolio_vol = float(np.sqrt(portfolio_var)) * 100  # 转成百分比
    max_drawdown_est = portfolio_vol * 2.5  # 粗略估算

    # 风险评分：基于波动率分档 1-5
    if portfolio_vol < 8:
        score, level = 1, "Very Low"
    elif portfolio_vol < 15:
        score, level = 2, "Low"
    elif portfolio_vol < 25:
        score, level = 3, "Medium"
    elif portfolio_vol < 40:
        score, level = 4, "High"
    else:
        score, level = 5, "Very High"

    return {
        "volatility": round(portfolio_vol, 2),
        "max_drawdown": round(max_drawdown_est, 2),
        "std_dev": round(portfolio_vol, 2),
        "risk_score": score,
        "risk_level": level,
        "allocation_snapshot": type_alloc,
    }

