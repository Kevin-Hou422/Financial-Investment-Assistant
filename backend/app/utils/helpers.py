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

# Exchange/category options per asset type (for API and validation)
STOCK_EXCHANGES = ("US", "HK", "AShare")
FUND_CATEGORIES = ("Domestic", "International")
CRYPTO_CATEGORIES = ("Spot",)
GOLD_CATEGORIES = ("Spot",)
BOND_CATEGORIES = ("Government", "Corporate")
FOREX_CATEGORIES = ("Major", "Cross")
CUSTOM_CATEGORIES = ("Other",)


def validate_asset_data(data: dict) -> bool:
    if data.get("quantity", 0) <= 0 or data.get("price", 0) <= 0:
        return False
    valid_types = [
        "Stock",
        "Fund",
        "Crypto",
        "Gold",
        "Bond",
        "Forex",
        "Custom",
    ]
    if data.get("type") not in valid_types:
        return False
    t = data.get("type")
    exchange = (data.get("exchange") or "").strip()
    if t == "Stock" and exchange and exchange not in STOCK_EXCHANGES:
        return False
    if t == "Fund" and exchange and exchange not in FUND_CATEGORIES:
        return False
    if t == "Crypto" and exchange and exchange not in CRYPTO_CATEGORIES:
        return False
    if t == "Gold" and exchange and exchange not in GOLD_CATEGORIES:
        return False
    if t == "Bond" and exchange and exchange not in BOND_CATEGORIES:
        return False
    if t == "Forex" and exchange and exchange not in FOREX_CATEGORIES:
        return False
    if t == "Custom" and exchange and exchange not in CUSTOM_CATEGORIES:
        return False
    return True