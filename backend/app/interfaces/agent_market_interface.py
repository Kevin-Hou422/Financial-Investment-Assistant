from datetime import datetime, timezone
from typing import Any, Dict, List

from app.db.database import load_assets
from app.external.crypto_api import fetch_crypto_price
from app.external.fund_api import fetch_fund_price
from app.external.gold_api import fetch_gold_price
from app.external.stock_api import fetch_stock_price


def _looks_like_symbol(value: str) -> bool:
    """
    Basic sanity check to avoid calling market APIs with non-symbol strings
    (e.g., names in other languages).
    """
    if not value:
        return False
    value = value.strip()
    if len(value) > 20:
        return False
    allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.^-=/_")
    return all(ch in allowed for ch in value)


def _fetch_for_asset_type(symbol: str, asset_type: str) -> Dict[str, Any]:
    asset_type_lower = asset_type.lower()
    if asset_type_lower == "stock":
        return fetch_stock_price(symbol, asset_type="stock")
    if asset_type_lower == "fund":
        return fetch_fund_price(symbol)
    if asset_type_lower == "crypto":
        return fetch_crypto_price(symbol)
    if asset_type_lower == "gold":
        return fetch_gold_price(symbol)
    return fetch_stock_price(symbol, asset_type="stock")


def get_market_snapshot() -> Dict[str, Any]:
    """
    Agent 预留接口：获取简化的市场快照。

    - 从当前资产列表中提取唯一标的代码与资产类型
    - 为每个标的调用对应 external API，返回价格与涨跌幅
    - 仅做数据汇总，不包含信号或策略判断
    """
    assets = load_assets()
    seen: set[tuple[str, str]] = set()
    quotes: List[Dict[str, Any]] = []

    for a in assets:
        symbol = a.get("name")
        asset_type = a.get("type", "Stock")
        if not symbol or not _looks_like_symbol(str(symbol)):
            continue
        key = (symbol, asset_type)
        if key in seen:
            continue
        seen.add(key)
        quote = _fetch_for_asset_type(symbol, asset_type)
        quotes.append(quote)

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "quotes": quotes,
    }

