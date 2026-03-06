import json
import os
from typing import Dict, List

from config import BASE_DIR

_CASHFLOW_FILE = os.path.join(BASE_DIR, "cashflows.json")


def _ensure_file() -> None:
  if not os.path.exists(_CASHFLOW_FILE):
    with open(_CASHFLOW_FILE, "w", encoding="utf-8") as f:
      json.dump([], f)


def load_cashflows() -> List[Dict]:
  _ensure_file()
  with open(_CASHFLOW_FILE, "r", encoding="utf-8") as f:
    return json.load(f)


def save_cashflows(items: List[Dict]) -> None:
  with open(_CASHFLOW_FILE, "w", encoding="utf-8") as f:
    json.dump(items, f, ensure_ascii=False, indent=2)

