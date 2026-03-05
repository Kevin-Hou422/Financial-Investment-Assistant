from datetime import datetime, timezone
from typing import Any, Dict

import yfinance as yf


def _safe_change_pct(price: float | None, previous_close: float | None) -> float | None:
    if price is None or previous_close in (None, 0):
        return None
    return (price - previous_close) / previous_close * 100


def fetch_stock_price(symbol: str, asset_type: str = "stock") -> Dict[str, Any]:
    """
    获取股票 / ETF / 基金等价格（支持格式如 AAPL, 700.HK, 510300.SS）。

    目前通过 yfinance.fast_info 获取最新价格和昨收，返回结构化 JSON：
    {
        "symbol": "AAPL",
        "asset_type": "stock",
        "price": 189.2,
        "change_pct": 1.23,
        "previous_close": 186.9,
        "timestamp": "2026-03-04T10:20:30Z",
        "error": null
    }
    """
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.fast_info

        # yfinance fast_info 字段在不同市场可能略有差异，这里做防御式读取
        last_price = float(getattr(data, "last_price", 0.0) or 0.0)
        previous_close = getattr(data, "previous_close", None)
        previous_close = float(previous_close) if previous_close not in (None, 0) else None

        change_pct = _safe_change_pct(last_price, previous_close)

        return {
            "symbol": symbol,
            "asset_type": asset_type,
            "price": last_price if last_price else None,
            "previous_close": previous_close,
            "change_pct": change_pct,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        # 出错时返回显式的错误字段，方便前端和 Agent 判断
        return {
            "symbol": symbol,
            "asset_type": asset_type,
            "price": None,
            "previous_close": None,
            "change_pct": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        }