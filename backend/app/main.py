from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import (
    agent,
    alerts,
    analytics,
    asset,
    cashflow,
    market,
    news,
    notification,
    plan,
    portfolio,
    report,
    risk,
    watchlist,
)
from app.scheduler.market_scheduler import setup_scheduler
from app.utils.generate_strategy import generate_strategy


app = FastAPI(title="AI Investment Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Asset management
app.include_router(asset.router)

# Cashflows
app.include_router(cashflow.router)

# Plans / goals
app.include_router(plan.router)

# Market data
app.include_router(market.router)

# Portfolio overview
app.include_router(portfolio.router)

# Risk metrics
app.include_router(risk.router)

# Reports
app.include_router(report.router)

# Notifications
app.include_router(notification.router)

# Watchlist
app.include_router(watchlist.router)

# Alerts
app.include_router(alerts.router)

# News
app.include_router(news.router)

# Analytics
app.include_router(analytics.router)

# Agent placeholder endpoints
app.include_router(agent.router)

# Scheduler: background refresh
setup_scheduler(app)


@app.get("/api/strategy")
def get_strategy():
    return generate_strategy()