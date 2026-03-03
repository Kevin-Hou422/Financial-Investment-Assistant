import json
import os
from typing import List, Dict
from config import DB_FILE, PREF_FILE

def load_assets() -> List[Dict]:
    if not os.path.exists(DB_FILE):
        return []
    with open(DB_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_assets(assets: List[Dict]):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(assets, f, ensure_ascii=False, indent=2)

def load_preferences() -> Dict:
    if not os.path.exists(PREF_FILE):
        return {"risk_preference": "Medium", "show_placeholder_chart": True}
    with open(PREF_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_preferences(prefs: Dict):
    with open(PREF_FILE, "w", encoding="utf-8") as f:
        json.dump(prefs, f, ensure_ascii=False, indent=2)