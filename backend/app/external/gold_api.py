from typing import Any, Dict

from .stock_api import fetch_stock_price


def fetch_gold_price(symbol: str) -> Dict[str, Any]:
    """
    获取黄金价格。

    目前通过 yfinance 通用接口实现，后续可替换为更专业的贵金属行情源。
    """
    return fetch_stock_price(symbol=symbol, asset_type="gold")

