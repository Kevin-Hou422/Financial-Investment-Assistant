# AI Investment Assistant

A full‑stack investment management application that supports multiple asset classes, portfolio analytics, watchlists, alerts, and news — with a clean web dashboard and reserved interfaces for future AI agents.

## 1. Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts  
- **Backend**: Python 3, FastAPI  
- **Storage**: JSON files (easily replaceable with a database in the future)

The architecture is intentionally simple to run locally, but the code is structured so that the storage layer can be swapped for SQLite/PostgreSQL later if needed.

---

## 2. Features Overview

### 2.1 Portfolio Dashboard

- Total portfolio cost, current value, and P&L / return.
- Asset allocation pie chart and bar chart (by type).
- Live market ticker panel (symbol + asset type, manual and auto refresh).
- Risk overview (estimated volatility and max drawdown).
- Concentration panel (Top 1 / Top 3 weights, HHI).
- Analytics panel:
  - Total portfolio value.
  - Simple value‑weighted portfolio return.
  - Per‑asset value and return table.
- Report & export panel:
  - Quick summary.
  - CSV export of current assets.
- Notification panel:
  - Risk, concentration, and goal‑related notifications.

### 2.2 Multi‑Asset Management

Supported asset types:

- Stocks (US/HK/CN can all be represented via ticker + type `Stock`)
- Funds
- Crypto
- Gold / Precious Metals
- Bonds
- Forex
- Custom

Pages:

- `/assets` – all assets in one table (search, type filter, CRUD).
- `/assets/stocks` – stocks only.
- `/assets/crypto` – crypto only.
- `/assets/gold` – gold only.
- `/assets/bonds` – bonds only.
- `/assets/forex` – forex only.
- `/assets/custom` – custom assets.

Each asset has:

- Name (ticker/symbol or descriptive name)
- Type (Stock, Fund, Crypto, Gold, Bond, Forex, Custom)
- Quantity
- Buy price
- Buy date
- Total value (calculated)

### 2.3 Market Data Module

- Backend integrates with **yfinance** for market data:
  - Stocks / ETFs / funds.
  - Crypto and gold currently reuse the same API (can be extended later).
- API:
  - `GET /api/market/price/{symbol}?asset_type=stock|fund|crypto|gold`
  - `GET /api/market/snapshot` (placeholder market snapshot).
- Frontend:
  - `MarketTickerPanel` allows selecting asset type and symbol, with manual and 30s auto refresh.

### 2.4 Watchlist

- Backend:
  - `GET /api/watchlist`
  - `POST /api/watchlist` – add symbol + asset_type + optional note.
  - `DELETE /api/watchlist/{id}`
- Frontend:
  - `WatchlistPage` at `/watchlist`.
  - Simple form to add items and a table to view / delete.

### 2.5 Alerts (Price Alerts)

- Backend:
  - `GET /api/alerts` – list alerts.
  - `POST /api/alerts` – create alert:
    - `symbol`, `asset_type`, `direction` (`above`/`below`), `target_price`.
  - `DELETE /api/alerts/{id}`
  - `GET /api/alerts/check` – checks all alerts against current market prices and returns the ones that are triggered.
- Frontend:
  - `AlertsPage` at `/alerts`.
  - Configure alerts and view active and triggered alerts.

### 2.6 Cashflows & Goals

- Cashflows:
  - `CashflowTable` at `/cashflows` – supports:
    - Deposit, Withdraw, Dividend, Fee.
    - Per‑type filters, inflow/outflow totals.
  - Backed by `cashflows.json`.
- Goals / Plans:
  - `PlanManager` at `/plans` – investment goals with:
    - Name, target amount, current amount, deadline.
    - Progress bar via `GoalProgressBar`.
  - Backed by `plans.json`.

### 2.7 Analytics

- Backend:
  - `GET /api/analytics/summary` – returns:
    - `total_value`
    - `portfolio_return_pct` (simple value‑weighted return)
    - `assets` with per‑asset value and return.
- Frontend:
  - `AnalyticsPanel` on the dashboard (side‑by‑side with report export).

### 2.8 Risk & Concentration

- Backend:
  - `GET /api/risk/metrics` – estimated volatility, max drawdown, risk score & level.
  - Risk estimation uses asset type allocation + assumed volatilities (Stock/Fund/Crypto/Gold).
- Frontend:
  - `RiskAnalysisPanel` on the dashboard.
  - `PortfolioConcentrationPanel` – Top1/Top3 allocation and HHI.

### 2.9 News

- Backend:
  - `GET /api/news` – mocked financial news (headline, summary, source).
- Frontend:
  - `NewsPage` at `/news` – card layout with refresh.

### 2.10 Notifications

- Backend:
  - `GET /api/notifications` – builds notifications based on:
    - High risk level.
    - High concentration.
    - Goals reached or near deadline.
- Frontend:
  - `NotificationPanel` on the dashboard.

### 2.11 Reports & Export

- Backend:
  - `GET /api/reports/assets` – full asset list.
  - `GET /api/reports/performance` – portfolio overview + cashflows + plans.
  - `GET /api/reports/export/csv` – CSV export of assets.
- Frontend:
  - `ReportExportPanel` – summary and **Download Asset CSV** button.

### 2.12 Future AI Agent Interfaces (Placeholders)

- Backend exposes AI‑ready endpoints:
  - `GET /agent/analyze_portfolio` – returns a structured portfolio snapshot.
  - `GET /agent/recommend_assets` – returns a market snapshot plus an empty recommendation list.
  - `GET /agent/risk_analysis` – returns current risk metrics.
- Currently they **do not perform any intelligent logic**, but the contract and data shape are ready for future integration.

---

## 3. API Overview (Backend)

Key endpoint groups (all prefixed by `http://<host>/api` unless noted):

- **Assets**  
  - `GET /api/assets?type=Stock|Fund|...`  
  - `POST /api/assets`  
  - `PUT /api/assets/{asset_id}`  
  - `DELETE /api/assets/{asset_id}`

- **Market**  
  - `GET /api/market/price/{symbol}?asset_type=...`  
  - `GET /api/market/snapshot`

- **Portfolio & Risk**  
  - `GET /api/portfolio/summary`  
  - `GET /api/portfolio/analysis`  
  - `GET /api/risk/metrics`  
  - `GET /api/analytics/summary`

- **Cashflows & Plans**  
  - `GET /api/cashflows`, `POST /api/cashflows`, `DELETE /api/cashflows/{id}`  
  - `GET /api/plans`, `POST /api/plans`, `PUT /api/plans/{id}`, `DELETE /api/plans/{id}`

- **Watchlist & Alerts**  
  - `GET /api/watchlist`, `POST /api/watchlist`, `DELETE /api/watchlist/{id}`  
  - `GET /api/alerts`, `POST /api/alerts`, `DELETE /api/alerts/{id}`, `GET /api/alerts/check`

- **News & Notifications & Reports**  
  - `GET /api/news`  
  - `GET /api/notifications`  
  - `GET /api/reports/assets`  
  - `GET /api/reports/performance`  
  - `GET /api/reports/export/csv`

- **Agent (placeholders, no real AI logic yet)**  
  - `GET /agent/analyze_portfolio`  
  - `GET /agent/recommend_assets`  
  - `GET /agent/risk_analysis`

---

## 4. Running the Project

### 4.1 Backend (FastAPI)

From the `backend` directory:

```bash
python -m pip install -r requirements.txt

# Example (port 8001)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

The API documentation will be available at:

- `http://127.0.0.1:8001/docs`

### 4.2 Frontend (React + Vite)

From the `frontend` directory:

```bash
npm install
npm run dev
```

The Vite dev server proxy is configured to forward `/api` to the backend (by default `http://localhost:8001`).  
If you change the backend port, update `vite.config.js` or set `VITE_API_BASE_URL` in your environment.

---

## 5. UX & Layout Notes

- Modern **top navbar** with product branding and compact navigation links.
- Main content area uses a single responsive column that becomes a grid on larger screens:
  - Cards for KPIs (cost, current value, P&L).
  - Panels for risk, notifications, allocation charts, placeholder strategy chart, concentration, reports, analytics.
- All tables are horizontally scrollable for small screens.
- Forms use consistent padding, rounded corners, and primary/secondary button styles.
- Error handling on all write operations (assets, cashflows, plans, watchlist, alerts) via small `alert()`s, so you always see why an operation failed.

---

## 6. Extending the System

When you are ready to evolve this into a production‑grade system, you can:

- Swap JSON storage for SQLite/PostgreSQL by replacing the `db/*.py` helpers with ORM models and queries.
- Plug a real news API into `/api/news`.
- Replace placeholder agent endpoints under `/agent/*` with calls into an AI service that:
  - Consumes `get_current_portfolio`, `get_market_snapshot`, and `get_risk_metrics`.
  - Returns human‑readable analysis and machine‑readable suggestions.
- Add per‑user authentication and authorization around all routes.

The current codebase is structured to make these upgrades straightforward without rewriting the entire app. 