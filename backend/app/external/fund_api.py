from typing import Any, Dict

from .stock_api import fetch_stock_price


def fetch_fund_price(symbol: str) -> Dict[str, Any]:
    """
    获取公募基金 / ETF 等价格。

    目前同样通过 yfinance 完成，未来可以根据实际数据源拆分为专用实现。
    """
    return fetch_stock_price(symbol=symbol, asset_type="fund")

