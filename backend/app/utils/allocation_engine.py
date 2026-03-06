from typing import Any, Dict, List


def _asset_value(asset: Dict[str, Any]) -> float:
    quantity = float(asset.get("quantity", 0) or 0)
    price = float(asset.get("price", 0) or 0)
    return quantity * price


def build_allocation_metrics(assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    组合分析：按资产类型与单资产维度计算占比和集中度。

    返回：
    {
        "total_value": float,
        "type_allocation": [{ "type": str, "value": float, "weight_pct": float }],
        "asset_allocation": [{ "id": str, "name": str, "type": str, "value": float, "weight_pct": float }],
        "concentration": {
            "top1_weight_pct": float,
            "top3_weight_pct": float,
            "hhi": float
        }
    }
    """
    total_value = sum(_asset_value(a) for a in assets)
    if total_value <= 0:
        return {
            "total_value": 0.0,
            "type_allocation": [],
            "asset_allocation": [],
            "concentration": {
                "top1_weight_pct": 0.0,
                "top3_weight_pct": 0.0,
                "hhi": 0.0,
            },
        }

    # 按资产类型聚合
    type_totals: Dict[str, float] = {}
    for asset in assets:
        t = asset.get("type", "Unknown")
        type_totals[t] = type_totals.get(t, 0.0) + _asset_value(asset)

    type_allocation = [
        {
            "type": t,
            "value": round(v, 2),
            "weight_pct": round(v / total_value * 100, 2),
        }
        for t, v in type_totals.items()
    ]

    # 单资产占比
    asset_allocation = []
    for asset in assets:
        value = _asset_value(asset)
        weight_pct = value / total_value * 100
        asset_allocation.append(
            {
                "id": asset.get("id"),
                "name": asset.get("name"),
                "type": asset.get("type"),
                "value": round(value, 2),
                "weight_pct": round(weight_pct, 2),
            }
        )

    # 集中度分析：Top1/Top3 占比 + HHI
    sorted_assets = sorted(
        asset_allocation, key=lambda x: x["weight_pct"], reverse=True
    )
    top1 = sorted_assets[0]["weight_pct"] if sorted_assets else 0.0
    top3 = sum(a["weight_pct"] for a in sorted_assets[:3]) if sorted_assets else 0.0
    hhi = sum((a["weight_pct"] / 100) ** 2 for a in sorted_assets)

    concentration = {
        "top1_weight_pct": round(top1, 2),
        "top3_weight_pct": round(top3, 2),
        "hhi": round(hhi, 4),
    }

    return {
        "total_value": round(total_value, 2),
        "type_allocation": type_allocation,
        "asset_allocation": asset_allocation,
        "concentration": concentration,
    }

