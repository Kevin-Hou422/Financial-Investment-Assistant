import json
import os
from typing import Dict, List

from config import BASE_DIR

_PLAN_FILE = os.path.join(BASE_DIR, "plans.json")


def _ensure_file() -> None:
  if not os.path.exists(_PLAN_FILE):
    with open(_PLAN_FILE, "w", encoding="utf-8") as f:
      json.dump([], f)


def load_plans() -> List[Dict]:
  _ensure_file()
  with open(_PLAN_FILE, "r", encoding="utf-8") as f:
    return json.load(f)


def save_plans(items: List[Dict]) -> None:
  with open(_PLAN_FILE, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

