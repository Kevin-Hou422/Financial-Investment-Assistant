from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import asset, market
from app.utils.generate_strategy import generate_strategy


app = FastAPI(title="AI Investment Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 资产管理接口
app.include_router(asset.router)

# 实时行情接口（/api/market/...）
app.include_router(market.router)


@app.get("/api/strategy")
def get_strategy():
    return generate_strategy()