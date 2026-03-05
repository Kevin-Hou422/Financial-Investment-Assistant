from fastapi import APIRouter, HTTPException, Query

from app.external.crypto_api import fetch_crypto_price
from app.external.fund_api import fetch_fund_price
from app.external.gold_api import fetch_gold_price
from app.external.stock_api import fetch_stock_price


# 统一挂载到 /api/market 前缀下，便于前端通过 baseURL=/api 调用
router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/price/{symbol}")
async def get_market_price(
    symbol: str,
    asset_type: str = Query(
        "stock",
        description="资产类型：stock/fund/crypto/gold",
        regex="^(stock|fund|crypto|gold)$",
    ),
):
    """
    获取单一资产的当前行情（价格、涨跌幅、时间戳等）。

    会根据 asset_type 分发到不同 external 模块，便于按资产类型扩展实现。
    """
    if asset_type == "stock":
        return fetch_stock_price(symbol=symbol, asset_type=asset_type)
    if asset_type == "fund":
        return fetch_fund_price(symbol=symbol)
    if asset_type == "crypto":
        return fetch_crypto_price(symbol=symbol)
    if asset_type == "gold":
        return fetch_gold_price(symbol=symbol)

    raise HTTPException(status_code=400, detail="Unsupported asset_type")


@router.get("/snapshot")
async def get_market_snapshot():
    """
    市场快照接口 —— 预留给 Agent 使用，只返回结构化数据。
    """
    # TODO: 后续可汇总多品种指数、波动率指数等信息
    return {"indices": {"SPX": 5100, "BTC": 67000}, "status": "active"}