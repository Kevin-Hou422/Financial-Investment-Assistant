from datetime import datetime, timezone
from typing import Any, Dict, Optional

import yfinance as yf


def build_yf_symbol(symbol: str, exchange: Optional[str] = None) -> str:
    """
    Build yfinance ticker from symbol + exchange.
    - US: AAPL (as-is)
    - HK: 700 or 0700 -> 0700.HK
    - AShare: 600519 -> 600519.SS (Shanghai), 000001 -> 000001.SZ (Shenzhen)
    """
    symbol = (symbol or "").strip()
    if not symbol:
        return symbol
    exchange = (exchange or "").strip()
    if exchange == "US" or not exchange:
        return symbol
    if exchange == "HK":
        # yfinance HK: 0700.HK (4 digits with leading zero)
        base = symbol.split(".")[0]
        if base.isdigit():
            base = base.zfill(4)
        return f"{base}.HK"
    if exchange == "AShare":
        # Shanghai 6xxxxx -> .SS, Shenzhen 0xxxxx/3xxxxx -> .SZ
        base = symbol.split(".")[0]
        if not base.isdigit():
            return f"{symbol}.SS"
        if base.startswith("6"):
            return f"{base}.SS"
        return f"{base}.SZ"
    return symbol


def _safe_change_pct(price: float | None, previous_close: float | None) -> float | None:
    if price is None or previous_close in (None, 0):
        return None
    return (price - previous_close) / previous_close * 100


def fetch_stock_price(
    symbol: str,
    asset_type: str = "stock",
    exchange: Optional[str] = None,
) -> Dict[str, Any]:
    """
    获取股票 / ETF / 基金等价格。exchange 用于解析标的：
    US / HK / AShare 对应美股、港股、A股，会拼成 yfinance 所需代码（如 0700.HK, 600519.SS）。

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
    yf_symbol = build_yf_symbol(symbol, exchange)
    try:
        ticker = yf.Ticker(yf_symbol)
        data = ticker.fast_info

        # yfinance fast_info 字段在不同市场可能略有差异，这里做防御式读取
        last_price = float(getattr(data, "last_price", 0.0) or 0.0)
        previous_close = getattr(data, "previous_close", None)
        previous_close = float(previous_close) if previous_close not in (None, 0) else None

        change_pct = _safe_change_pct(last_price, previous_close)

        return {
            "symbol": yf_symbol,
            "asset_type": asset_type,
            "exchange": exchange,
            "price": last_price if last_price else None,
            "previous_close": previous_close,
            "change_pct": change_pct,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "symbol": yf_symbol,
            "asset_type": asset_type,
            "exchange": exchange,
            "price": None,
            "previous_close": None,
            "change_pct": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "error": str(exc),
        }