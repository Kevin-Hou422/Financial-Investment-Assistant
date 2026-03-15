from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import create_tables
from app.routes import (
    asset, cashflow, plan, alerts, watchlist,
    portfolio, risk, analytics, notification, report,
    market, news, strategy,
)
from app.routes.auth import router as auth_router
from app.routes.agent import router as agent_router

app = FastAPI(title="AI Investment Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all DB tables on startup
@app.on_event("startup")
def on_startup():
    create_tables()


app.include_router(auth_router)
app.include_router(asset.router)
app.include_router(cashflow.router)
app.include_router(plan.router)
app.include_router(alerts.router)
app.include_router(watchlist.router)
app.include_router(portfolio.router)
app.include_router(risk.router)
app.include_router(analytics.router)
app.include_router(notification.router)
app.include_router(report.router)
app.include_router(market.router)
app.include_router(news.router)
app.include_router(strategy.router)
app.include_router(agent_router)
