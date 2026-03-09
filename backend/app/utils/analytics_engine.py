from typing import Any, Dict, List


def _asset_value(asset: Dict[str, Any]) -> float:
    return float(asset.get("quantity", 0) or 0) * float(asset.get("price", 0) or 0)


def _asset_return(asset: Dict[str, Any]) -> float:
    quantity = float(asset.get("quantity", 0) or 0)
    price = float(asset.get("price", 0) or 0)
    cost = float(asset.get("avg_cost", price) or price)
    if quantity <= 0 or cost <= 0:
        return 0.0
    return (price - cost) / cost * 100


def portfolio_analytics(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Basic analytics over current holdings, without requiring a full
    time series:

    - total_value
    - per-asset value and return
    - naive portfolio return (value-weighted)
    """
    by_asset: List[Dict[str, Any]] = []
    total_value = 0.0
    for a in assets:
        value = _asset_value(a)
        total_value += value
        by_asset.append(
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "type": a.get("type"),
                "value": round(value, 2),
                "return_pct": round(_asset_return(a), 2),
            }
        )

    # value-weighted portfolio return
    if total_value > 0:
        port_ret = sum(
            item["value"] / total_value * item["return_pct"] for item in by_asset
        )
    else:
        port_ret = 0.0

    return {
        "total_value": round(total_value, 2),
        "portfolio_return_pct": round(port_ret, 2),
        "assets": by_asset,
    }

