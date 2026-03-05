from fastapi import APIRouter, Query

from app.external.stock_api import fetch_stock_price


# 统一挂载到 /api/market 前缀下，便于前端通过 baseURL=/api 调用
router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/price/{symbol}")
async def get_market_price(
    symbol: str,
    asset_type: str = Query("stock", description="资产类型：stock/fund/crypto/gold"),
):
    """
    获取单一资产的当前行情（价格、涨跌幅、时间戳等）。

    目前主要通过 yfinance 实现，未来可以在 external 模块中扩展不同资产类型的实现。
    """
    # 目前先统一走股票/基金实现，后续根据 asset_type 拆分到不同 external 模块
    return fetch_stock_price(symbol=symbol, asset_type=asset_type)


@router.get("/snapshot")
async def get_market_snapshot():
    """
    市场快照接口 —— 预留给 Agent 使用，只返回结构化数据。
    """
    # TODO: 后续可汇总多品种指数、波动率指数等信息
    return {"indices": {"SPX": 5100, "BTC": 67000}, "status": "active"}