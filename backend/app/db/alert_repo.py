import json
import os
from typing import Dict, List

from config import BASE_DIR

_ALERT_FILE = os.path.join(BASE_DIR, "alerts.json")


def _ensure_file() -> None:
    if not os.path.exists(_ALERT_FILE):
        with open(_ALERT_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)


def load_alerts() -> List[Dict]:
    _ensure_file()
    with open(_ALERT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_alerts(items: List[Dict]) -> None:
    with open(_ALERT_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

