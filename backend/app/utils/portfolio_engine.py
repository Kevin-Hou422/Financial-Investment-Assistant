from typing import Any, Dict, List, Tuple

from app.external.crypto_api import fetch_crypto_price
from app.external.fund_api import fetch_fund_price
from app.external.gold_api import fetch_gold_price
from app.external.stock_api import fetch_stock_price


def _resolve_price_for_asset(asset: Dict[str, Any]) -> Tuple[float, float]:
    """
    为单个资产获取成本价和当前价。

    - 成本价：数量 × 买入价
    - 当前价：优先使用实时行情；若行情不可用则退回买入价。
    """
    quantity = float(asset.get("quantity", 0) or 0)
    buy_price = float(asset.get("price", 0) or 0)

    asset_type = str(asset.get("type", "Stock")).lower()
    symbol = asset.get("name")

    current_price = buy_price
    if symbol:
        if asset_type == "stock":
            quote = fetch_stock_price(symbol, asset_type="stock")
        elif asset_type == "fund":
            quote = fetch_fund_price(symbol)
        elif asset_type == "crypto":
            quote = fetch_crypto_price(symbol)
        elif asset_type == "gold":
            quote = fetch_gold_price(symbol)
        else:
            quote = fetch_stock_price(symbol, asset_type="stock")

        if not quote.get("error") and quote.get("price") not in (None, 0):
            current_price = float(quote["price"])

    cost_value = quantity * buy_price
    current_value = quantity * current_price
    return cost_value, current_value


def calculate_portfolio_overview(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    计算组合层面的盈亏概览。

    返回：
    {
        "total_cost": float,
        "total_current_value": float,
        "pnl_amount": float,
        "pnl_pct": float,
    }
    """
    total_cost = 0.0
    total_current = 0.0

    for asset in assets:
        cost, current = _resolve_price_for_asset(asset)
        total_cost += cost
        total_current += current

    pnl_amount = total_current - total_cost
    pnl_pct = (pnl_amount / total_cost * 100) if total_cost else 0.0

    return {
        "total_cost": round(total_cost, 2),
        "total_current_value": round(total_current, 2),
        "pnl_amount": round(pnl_amount, 2),
        "pnl_pct": round(pnl_pct, 2),
    }

