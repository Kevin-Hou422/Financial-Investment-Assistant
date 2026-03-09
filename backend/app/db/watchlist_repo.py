import json
import os
from typing import Dict, List

from config import BASE_DIR

_WATCHLIST_FILE = os.path.join(BASE_DIR, "watchlist.json")


def _ensure_file() -> None:
    if not os.path.exists(_WATCHLIST_FILE):
        with open(_WATCHLIST_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)


def load_watchlist() -> List[Dict]:
    _ensure_file()
    with open(_WATCHLIST_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_watchlist(items: List[Dict]) -> None:
    with open(_WATCHLIST_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

