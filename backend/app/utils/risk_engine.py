import numpy as np

def calculate_volatility(returns_list):
    """计算年化波动率"""
    if len(returns_list) < 2: return 0
    return np.std(returns_list) * np.sqrt(252)

def calculate_max_drawdown(value_history):
    """计算最大回撤"""
    if not value_history: return 0
    values = np.array(value_history)
    peak = np.maximum.accumulate(values)
    drawdown = (peak - values) / peak
    return np.max(drawdown)