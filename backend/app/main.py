from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import asset, cashflow, market, plan, portfolio, risk
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

# 资金流水接口
app.include_router(cashflow.router)

# 投资目标与计划接口
app.include_router(plan.router)

# 实时行情接口（/api/market/...）
app.include_router(market.router)

# 投资组合概览与盈亏接口（/api/portfolio/...）
app.include_router(portfolio.router)

# 风险分析接口（/api/risk/...）
app.include_router(risk.router)


@app.get("/api/strategy")
def get_strategy():
    return generate_strategy()