from typing import List, Dict

def calculate_total(assets: List[Dict]) -> float:
    return sum(asset["quantity"] * asset["price"] for asset in assets)

def calculate_type_percentage(assets: List[Dict]) -> Dict[str, float]:
    total = calculate_total(assets)
    if total == 0:
        return {}
    type_totals = {}
    for asset in assets:
        t = asset["type"]
        type_totals[t] = type_totals.get(t, 0) + (asset["quantity"] * asset["price"])
    return {k: round((v / total) * 100, 2) for k, v in type_totals.items()}

def validate_asset_data(data: dict) -> bool:
    if data.get("quantity", 0) <= 0 or data.get("price", 0) <= 0:
        return False
    valid_types = ["Stock", "Fund", "Crypto", "Gold"]
    if data.get("type") not in valid_types:
        return False
    return True