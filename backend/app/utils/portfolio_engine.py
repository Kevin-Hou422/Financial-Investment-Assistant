from collections import defaultdict
from typing import Any, Dict, List, Tuple

from app.external.crypto_api import fetch_crypto_price
from app.external.fund_api import fetch_fund_price
from app.external.gold_api import fetch_gold_price
from app.external.stock_api import fetch_stock_price

from app.external.fx_api import get_fx_rates

_EXCHANGE_CURRENCY: Dict[str, str] = {
    "US": "USD", "HK": "HKD", "AShare": "CNY",
    "Domestic": "CNY", "International": "USD",
    "Spot": "USD", "Government": "USD", "Corporate": "USD",
    "Major": "USD", "Cross": "USD", "Other": "USD",
}


def _to_usd(value: float, exchange: str) -> float:
    currency = _EXCHANGE_CURRENCY.get(exchange, "USD")
    rate = get_fx_rates().get(currency, 1.0)
    return value * rate


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
    exchange = asset.get("exchange") or ""

    current_price = buy_price
    if symbol:
        if asset_type == "stock":
            quote = fetch_stock_price(
                symbol, asset_type="stock", exchange=exchange
            )
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
    exchange = asset.get("exchange", "US") or "US"
    return _to_usd(cost_value, exchange), _to_usd(current_value, exchange)


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


# Alias used by new routes
def compute_summary(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    return calculate_portfolio_overview(assets)


def compute_analysis(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Concentration analysis: HHI, top-N weights."""
    if not assets:
        return {"concentration": {"top1_weight_pct": 0, "top3_weight_pct": 0, "hhi": 0}}
    values = []
    for a in assets:
        _, cur = _resolve_price_for_asset(a)
        values.append((a.get("name", ""), cur))
    total = sum(v for _, v in values) or 1
    weights = sorted([v / total for _, v in values], reverse=True)
    hhi = sum(w ** 2 for w in weights)
    top1 = weights[0] * 100 if weights else 0
    top3 = sum(weights[:3]) * 100 if weights else 0
    return {
        "concentration": {
            "top1_weight_pct": round(top1, 2),
            "top3_weight_pct": round(top3, 2),
            "hhi": round(hhi, 4),
        }
    }


# Estimated volatility by asset type
_VOL_BY_TYPE = {"stock": 15, "crypto": 60, "gold": 12, "fund": 10, "bond": 5, "forex": 8}


def compute_risk_metrics(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not assets:
        return {"volatility": 0, "max_drawdown": 0}
    type_values: Dict[str, float] = defaultdict(float)
    for a in assets:
        _, cur = _resolve_price_for_asset(a)
        type_values[str(a.get("type", "stock")).lower()] += cur
    total = sum(type_values.values()) or 1
    weighted_vol = sum(
        _VOL_BY_TYPE.get(t, 15) * (v / total) for t, v in type_values.items()
    )
    max_drawdown = round(weighted_vol * 0.6, 1)
    return {
        "volatility": round(weighted_vol, 1),
        "max_drawdown": max_drawdown,
    }


def compute_analytics(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not assets:
        return {"total_value": 0, "portfolio_return_pct": 0, "assets": []}
    rows = []
    total_cost = 0.0
    total_value = 0.0
    for a in assets:
        cost, cur = _resolve_price_for_asset(a)
        ret_pct = ((cur - cost) / cost * 100) if cost else 0
        total_cost += cost
        total_value += cur
        rows.append({
            "id": a.get("id", ""),
            "name": a.get("name", ""),
            "type": a.get("type", ""),
            "value": round(cur, 2),
            "return_pct": round(ret_pct, 2),
        })
    portfolio_return_pct = ((total_value - total_cost) / total_cost * 100) if total_cost else 0
    return {
        "total_value": round(total_value, 2),
        "portfolio_return_pct": round(portfolio_return_pct, 2),
        "assets": rows,
    }

