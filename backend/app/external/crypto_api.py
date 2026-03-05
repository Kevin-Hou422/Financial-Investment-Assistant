from typing import Any, Dict

from .stock_api import fetch_stock_price


def fetch_crypto_price(symbol: str) -> Dict[str, Any]:
    """
    获取加密货币价格。

    暂时复用 yfinance 能力，通过通用的 fetch_stock_price 完成，
    但 asset_type 标记为 crypto，便于前端和上层逻辑区分。
    """
    return fetch_stock_price(symbol=symbol, asset_type="crypto")

