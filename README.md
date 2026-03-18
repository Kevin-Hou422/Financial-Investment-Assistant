# AI Investment Assistant

> A full-stack, multi-agent AI-powered personal investment management platform. Manage multi-asset portfolios across global markets, get AI-driven strategy and risk analysis, chat with a live AI assistant, and receive real-time market insights — all in a dark-mode, modern dashboard.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [System Architecture](#3-system-architecture)
4. [Code Structure](#4-code-structure)
5. [Core Workflows](#5-core-workflows)
6. [Tech Stack](#6-tech-stack)
7. [API Reference](#7-api-reference)
8. [Multi-Agent System](#8-multi-agent-system)
9. [Setup & Installation](#9-setup--installation)
10. [Environment Variables](#10-environment-variables)
11. [Design Philosophy](#11-design-philosophy)
12. [Currency & FX Support](#12-currency--fx-support)
13. [Authentication](#13-authentication)
14. [Performance Optimizations](#14-performance-optimizations)
15. [Known Limitations & Roadmap](#15-known-limitations--roadmap)

---

## 1. Project Overview

AI Investment Assistant is a personal finance platform that combines:

- **Portfolio management** across stocks (US/HK/A-Share), crypto, gold, bonds, funds, and forex
- **Real-time market data** via Yahoo Finance, CoinGecko, and RSS news feeds
- **Multi-agent AI analysis** powered by OpenAI GPT-4o-mini with an intent-routing manager and specialized agents
- **Persistent AI chat** with full session management (create, continue, delete conversations)
- **AI Strategy** — persisted multi-agent portfolio analysis with variance-aware 12-month projections
- **Google OAuth + email/password authentication** with per-user data isolation via SQLite

The system is designed for individual investors who want institutional-quality analysis without the complexity of enterprise tools.

---

## 2. Features

### Portfolio Management
| Feature | Description |
|---|---|
| Multi-asset tracking | Stocks (US, HK, A-Share), Crypto, Gold, Bonds, Funds, Forex |
| Multi-currency | Per-exchange currency display (USD/HKD/CNY). Totals converted to USD |
| Sector view | Large tile-based asset sector selection with sub-category drill-down |
| Real-time prices | Fetched via yfinance (stocks), CoinGecko (crypto), custom adapters (gold/funds) |
| P&L calculation | Live cost vs current value with % return |
| Decimal precision | Full decimal support (step="any") for price and quantity fields |

### Dashboard
| Feature | Description |
|---|---|
| Overview cards | Total cost, current value, P&L/return |
| Asset allocation | Pie chart by asset type |
| Value by type | Bar chart with color-coded categories |
| Risk overview | Weighted volatility + max drawdown |
| AI Strategy widget | Quick view with link to full AI Strategy page |
| Portfolio concentration | HHI, top-1/top-3 weight analysis |
| Smart caching | 5-minute localStorage cache — no redundant API calls on navigation |

### AI Strategy
- Click **Generate AI Strategy** to trigger a multi-agent pipeline (risk + strategy analysts)
- Results persist across refreshes via `localStorage` until explicitly regenerated
- Projection chart shows realistic monthly variance based on AI-determined strategy type and risk level
- Base (linear) + AI-adjusted (variance) lines shown simultaneously

### AI Chat
- Full left sidebar showing all conversation sessions with titles auto-set from first message
- Create new chats, continue existing ones, delete individual sessions
- All sessions stored in `localStorage` (`ai_chat_sessions_v1`)
- Backend agent memory stores last 10 turns per user (30-day TTL)
- Quick-action buttons for common queries (Portfolio Overview, Risk Analysis, Rebalance, etc.)
- Language auto-detection: responds in English or Chinese based on user input

### Market & News
- Real-time ticker panel for major indices (S&P 500, NASDAQ, BTC, Gold, etc.)
- RSS news feed aggregated from multiple financial sources
- Watchlist with price alerts (above/below threshold)

### Authentication
- Email/password with bcrypt hashing and JWT tokens
- Google OAuth 2.0 (real redirect flow)
- Typewriter animated title on auth page
- Per-user complete data isolation

### Goals & Cashflow
- Financial goal tracking with progress bars
- Income/expense cashflow logging with net flow analysis
- Report export panel

---

## 3. System Architecture

```
+---------------------------------------------------------------------+
|                       FRONTEND (React + Vite)                       |
|  +----------+  +----------+  +----------+  +--------------------+  |
|  |Dashboard |  | Assets   |  |AI Chat   |  |  AI Strategy Page  |  |
|  |(cached)  |  |(currency)|  |(sidebar) |  |  (localStorage)    |  |
|  +----+-----+  +----+-----+  +----+-----+  +--------+-----------+  |
|       +-------------------+-------------------+----------------+    |
|                    axios (JWT interceptor)                          |
+------------------------------+--------------------------------------+
                               |  HTTP / REST
+------------------------------v--------------------------------------+
|                     BACKEND (FastAPI + Python)                      |
|                                                                     |
|  Route Layer (/api/*)                                               |
|  auth · assets · portfolio · risk · strategy · agent · market ...  |
|                             |                                       |
|  Multi-Agent System                                                 |
|    User intent                                                      |
|        -> Manager Agent  (keyword scoring, zero tokens)             |
|        -> Workflow Engine (single / pipeline / parallel)            |
|        -> Specialized Agents (portfolio/risk/strategy/market/rsrch) |
|        -> LLM Client (dual-key rotation + daily quota)              |
|        -> LLM Cache (SHA-256, 5-min TTL, 500 cap)                   |
|                             |                                       |
|  Persistence Layer (SQLAlchemy + SQLite)                            |
|  users · assets · cashflows · plans · alerts · watchlist            |
|  agent_memory · agent_logs                                          |
|                             |                                       |
|  External Data Sources                                              |
|  yfinance (stocks/ETFs) · CoinGecko (crypto) · RSS (news)           |
|  Custom adapters: gold_api · fund_api · crypto_api                  |
+---------------------------------------------------------------------+
```

---

## 4. Code Structure

```
Financial Investment Assistant/
+-- backend/
|   +-- app/
|   |   +-- main.py                    # FastAPI app, CORS, router registration
|   |   +-- agents/
|   |   |   +-- core/
|   |   |   |   +-- base.py            # AgentTask, AgentResult dataclasses
|   |   |   |   +-- manager.py         # Intent classifier + pipeline definitions
|   |   |   |   +-- llm_client.py      # OpenAI client with dual-key rotation
|   |   |   |   +-- key_manager.py     # Per-key daily token quota tracking
|   |   |   |   +-- cache.py           # SHA-256 LLM response cache (5-min TTL)
|   |   |   |   +-- memory.py          # Per-user conversation memory (SQLite)
|   |   |   |   +-- logger.py          # Agent call logging (tokens, latency)
|   |   |   +-- agents/
|   |   |   |   +-- portfolio_agent.py # Portfolio overview & highlights
|   |   |   |   +-- risk_agent.py      # Risk scoring, top risks, recommendations
|   |   |   |   +-- strategy_agent.py  # Rebalancing plan, target allocation
|   |   |   |   +-- market_agent.py    # Market conditions, macro context
|   |   |   |   +-- research_agent.py  # Research queries, asset deep-dives
|   |   |   +-- tools/
|   |   |   |   +-- tools.py           # ToolRegistry - data accessors for agents
|   |   |   +-- workflows/
|   |   |       +-- workflow.py        # run_single / run_pipeline / run_parallel
|   |   +-- db/
|   |   |   +-- models.py              # SQLAlchemy ORM models
|   |   |   +-- session.py             # DB engine + get_db dependency
|   |   |   +-- asset_repo.py          # CRUD for assets + currency derivation
|   |   |   +-- cashflow_repo.py       # CRUD for cashflows
|   |   |   +-- plan_repo.py           # CRUD for financial goals/plans
|   |   |   +-- alert_repo.py          # CRUD for price alerts
|   |   |   +-- watchlist_repo.py      # CRUD for watchlist items
|   |   |   +-- report_repo.py         # Report persistence
|   |   +-- external/
|   |   |   +-- stock_api.py           # yfinance wrapper (US/HK/AShare)
|   |   |   +-- crypto_api.py          # CoinGecko price fetcher
|   |   |   +-- gold_api.py            # Gold price adapter
|   |   |   +-- fund_api.py            # Fund price adapter
|   |   +-- interfaces/                # Agent data access interfaces
|   |   |   +-- agent_portfolio_interface.py
|   |   |   +-- agent_risk_interface.py
|   |   |   +-- agent_market_interface.py
|   |   |   +-- agent_research_interface.py
|   |   +-- routes/
|   |   |   +-- auth.py               # /api/auth/* - JWT + Google OAuth
|   |   |   +-- asset.py              # /api/assets CRUD
|   |   |   +-- portfolio.py          # /api/portfolio/summary + analysis
|   |   |   +-- risk.py               # /api/risk/metrics
|   |   |   +-- analytics.py          # /api/analytics/summary
|   |   |   +-- strategy.py           # /api/strategy - projection chart
|   |   |   +-- agent.py              # /api/agent/chat + logs + memory
|   |   |   +-- market.py             # /api/market/*
|   |   |   +-- news.py               # /api/news
|   |   |   +-- cashflow.py           # /api/cashflows CRUD
|   |   |   +-- plan.py               # /api/plans CRUD
|   |   |   +-- alerts.py             # /api/alerts CRUD
|   |   |   +-- watchlist.py          # /api/watchlist CRUD
|   |   |   +-- notification.py       # /api/notifications
|   |   |   +-- report.py             # /api/reports/*
|   |   +-- utils/
|   |   |   +-- portfolio_engine.py   # Core P&L calc with FX conversion
|   |   |   +-- risk_engine.py        # Volatility, drawdown calculation
|   |   |   +-- analytics_engine.py   # Per-asset analytics
|   |   |   +-- allocation_engine.py  # Portfolio allocation analysis
|   |   |   +-- performance_engine.py # Performance attribution
|   |   |   +-- pricing_engine.py     # Price resolution logic
|   |   |   +-- auth_utils.py         # JWT creation + verification
|   |   |   +-- helpers.py            # Shared utility functions
|   |   +-- scheduler/
|   |       +-- market_scheduler.py   # Background price refresh scheduler
|   +-- .env                          # Environment variables (do NOT commit)
|   +-- requirements.txt
|
+-- frontend/
|   +-- src/
|   |   +-- components/
|   |   |   +-- AuthPage.jsx           # Login/register + Google OAuth + typewriter
|   |   |   +-- Dashboard.jsx          # Main dashboard (5-min cache)
|   |   |   +-- AssetSectorPage.jsx    # Sector tile selector
|   |   |   +-- AssetCategoryPage.jsx  # Sub-category asset view
|   |   |   +-- AssetList.jsx          # Asset table with currency display
|   |   |   +-- AssetForm.jsx          # Add/edit asset (per-currency labels)
|   |   |   +-- AIChatPage.jsx         # AI chat with sidebar session management
|   |   |   +-- AIStrategyPage.jsx     # AI strategy (persisted, variance chart)
|   |   |   +-- Navbar.jsx             # Top nav bar (centered items)
|   |   |   +-- AlertsPage.jsx         # Price alert management
|   |   |   +-- WatchlistPage.jsx      # Watchlist
|   |   |   +-- NewsPage.jsx           # News feed
|   |   |   +-- CashflowTable.jsx      # Cashflow log
|   |   |   +-- PlanManager.jsx        # Financial goals
|   |   |   +-- RiskAnalysisPanel.jsx  # Risk metrics widget
|   |   |   +-- MarketTickerPanel.jsx  # Live market ticker
|   |   |   +-- PlaceholderChart.jsx   # Strategy preview chart on dashboard
|   |   |   +-- ...
|   |   +-- services/
|   |   |   +-- api.js                 # Axios instance + JWT interceptor
|   |   |   +-- riskService.js
|   |   |   +-- analyticsService.js
|   |   |   +-- ...
|   |   +-- utils/
|   |   |   +-- helpers.js             # formatCurrency, formatCurrencyForExchange
|   |   |   +-- assetCategories.js     # Asset types, exchange->currency map, FX rates
|   |   |   +-- dashboardCache.js      # 5-min localStorage dashboard cache
|   |   +-- context/
|   |   |   +-- AuthContext.jsx        # Auth state, login/register/logout
|   |   +-- App.jsx                    # Router setup
|   +-- vite.config.js                 # Vite + proxy (/api -> :8000)
|   +-- package.json
+-- README.md
```

---

## 5. Core Workflows

### 5.1 Asset Management + Currency Conversion

```
User fills form
  -> selects type: Stock
  -> selects exchange: HK Stocks
  -> AssetForm shows "HKD" label on price input
  -> POST /api/assets
       asset_repo stores: price in HKD, total_value = qty x price(HKD)
       returns: { currency: "HKD", ... }
  -> portfolio_engine._resolve_price_for_asset()
       fetches current HKD price from yfinance
       calls _to_usd(value, "HK")  ->  value x 0.1282
  -> Dashboard totals shown in USD
  -> AssetList shows: HK$48.50 / HK$9,700 (native HKD format)
```

### 5.2 Multi-Agent Chat Flow

```
User types message
  -> POST /api/agent/chat
  -> manager_agent.classify_intent()
       keyword scoring -> picks intent (e.g., "risk_analysis")

  Single intent   -> run_single(risk_analyst)
  Pipeline intent -> run_pipeline([risk_analyst -> strategy_analyst])
                     (rebalance_advice, full_report, performance_review)

Each agent:
  1. Loads conversation memory (last 10 turns from SQLite)
  2. Fetches tool data (portfolio, risk metrics, market data)
  3. Calls LLM with <300 token prompt + tool data context
  4. LLM client: random key selection -> quota check -> cache check -> OpenAI call
  5. Logs result (tokens, latency, status) to agent_logs
  6. Saves turn to agent_memory

Returns: { intent, pipeline, agents_called, results[], total_tokens, total_latency_ms }
```

### 5.3 Dashboard Cache Flow

```
Navigate to Dashboard
  -> getDashboardCache()  ->  valid? (< 5 min)
       YES: render instantly from localStorage
       NO:  Promise.allSettled([getAssets(), /portfolio/summary, riskService.getMetrics()])
              -> setDashboardCache({ assets, overview, risk })
              -> render

Add/Edit/Delete asset -> invalidateDashboardCache()
Next Dashboard visit  -> fresh fetch
```

### 5.4 AI Strategy Persistence

```
Click "Generate AI Strategy"
  -> POST /api/agent/chat (multi-agent: risk + strategy)
  -> setAiData(result)
  -> localStorage.setItem('ai_strategy_v1', JSON.stringify(result))
  -> buildAdjustedProjection(baseData, stratOutput, riskOutput)
       Strategy type -> monthly growth rate
         conservative 0.42% / balanced 0.72% / aggressive 1.1%
       Risk level -> monthly volatility
         low 1% / medium 2.2% / high 3.8% / critical 5.5%
       Deterministic pseudo-random noise (seeded by portfolio start value)

Chart: grey dashed (base linear) + purple (AI-adjusted with variance)

Page refresh / navigation -> loads from localStorage -> no API call
Click "Regenerate"        -> clears localStorage -> triggers new analysis
```

### 5.5 Authentication Flow

```
Email/Password:
  Register -> bcrypt hash -> INSERT users -> JWT (7d)
  Login    -> verify bcrypt hash -> JWT (7d)

Google OAuth:
  1. User clicks "Continue with Google"
  2. Redirect to /api/auth/google
  3. Backend builds Google authorization URL and redirects
  4. User consents on Google
  5. Google redirects to /api/auth/callback?code=xxx
  6. Backend exchanges code for tokens, fetches user profile
  7. Upserts user by google_id in DB
  8. Issues JWT, redirects to frontend: /?token=xxx
  9. AuthCallback.jsx stores token -> navigate to dashboard

JWT validation on every protected route:
  Authorization: Bearer <token> -> get_current_user() -> user ORM object
```

---

## 6. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool + dev server |
| Tailwind CSS | 3.4 | Utility-first styling |
| React Router | 7.13 | Client-side routing |
| Axios | 1.13 | HTTP client with interceptors |
| Recharts | 3.7 | Charts (Line/Pie/Bar/Radar) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Runtime |
| FastAPI | 0.104 | REST API framework |
| Uvicorn | 0.24 | ASGI server |
| SQLAlchemy | 2.0+ | ORM |
| SQLite | built-in | Database |
| python-jose | latest | JWT creation/validation |
| passlib[bcrypt] | latest | Password hashing |
| httpx | latest | Async HTTP client |
| yfinance | latest | Stock/ETF price data |
| feedparser | latest | RSS news parsing |
| python-dotenv | latest | .env loading |
| OpenAI API | gpt-4o-mini | LLM for multi-agent system |

---

## 7. API Reference

### Authentication
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account (email + password) |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/google` | Initiate Google OAuth redirect |
| GET | `/api/auth/callback` | Google OAuth callback handler |
| GET | `/api/auth/me` | Get current user info |

### Assets
| Method | Path | Description |
|---|---|---|
| GET | `/api/assets` | List user assets (filter: type, exchange) |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/{id}` | Update asset |
| DELETE | `/api/assets/{id}` | Delete asset |

**Asset fields**: `name`, `type`, `exchange`, `currency` (derived), `quantity`, `price`, `total_value`, `buy_date`

### Portfolio
| Method | Path | Description |
|---|---|---|
| GET | `/api/portfolio/summary` | Total cost, current value, P&L (USD) |
| GET | `/api/portfolio/analysis` | Concentration: HHI, top-N weights |

### Risk & Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/risk/metrics` | Weighted volatility, max drawdown |
| GET | `/api/analytics/summary` | Per-asset analytics, portfolio return |

### Strategy
| Method | Path | Description |
|---|---|---|
| GET | `/api/strategy` | 12-month projection with variance |
| POST | `/api/strategy/ai` | Full AI strategy via agent pipeline |

### Agent (Multi-Agent Chat)
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/agent/chat` | `{message, token_budget}` | Send message, get agent response |
| DELETE | `/api/agent/memory` | — | Clear conversation memory |
| GET | `/api/agent/logs` | `?limit=50` | Agent call logs |
| GET | `/api/agent/intents` | — | Available intents |
| GET | `/api/agent/keys/usage` | — | Per-key daily token usage |

### Market & News
| Method | Path | Description |
|---|---|---|
| GET | `/api/market/prices` | Current prices for symbols |
| GET | `/api/market/ticker` | Major index ticker data |
| GET | `/api/news` | Aggregated financial news (RSS) |

### Financial Planning
| Method | Path | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/cashflows` | Cashflow management |
| GET/POST/PUT/DELETE | `/api/plans` | Financial goals |
| GET/POST/DELETE | `/api/alerts` | Price alerts |
| GET/POST/DELETE | `/api/watchlist` | Watchlist |
| GET | `/api/reports/performance` | Performance report |
| GET | `/api/notifications` | In-app notifications |

---

## 8. Multi-Agent System

### Intent Classification

The manager agent uses zero-token keyword scoring (no LLM call) to classify 8 intents:

| Intent | Trigger Keywords | Pipeline |
|---|---|---|
| `portfolio_overview` | portfolio, overview, holdings | single: portfolio_analyst |
| `risk_analysis` | risk, volatility, drawdown, hedge | single: risk_analyst |
| `performance_review` | performance, return, profit, gain | pipeline: portfolio -> risk |
| `rebalance_advice` | rebalance, allocation, adjust, weight | pipeline: risk -> strategy |
| `goal_tracking` | goal, target, milestone, saving | single: portfolio_analyst |
| `market_analysis` | market, macro, sector, trend | single: market_analyst |
| `research` | research, info, what is, explain | single: research_analyst |
| `full_report` | full, report, comprehensive, complete | pipeline: portfolio -> risk -> strategy |

### Agent Capabilities

| Agent | Data Access | Key Output Fields |
|---|---|---|
| `portfolio_analyst` | Assets, cashflows, plans | summary, highlights, diversification |
| `risk_analyst` | Risk metrics, asset weights | risk_level, risk_score, top_risks, recommendation |
| `strategy_analyst` | Risk output, portfolio data | strategy_type, rationale, rebalance_actions, target_allocation, next_steps |
| `market_analyst` | Market ticker, news | market_summary, sector_outlook, impact_on_portfolio |
| `research_analyst` | News, watchlist | research_summary, key_findings, data_points |

### LLM Configuration

| Setting | Value |
|---|---|
| Default model | `gpt-4o-mini` |
| Key rotation | Random between OPENAI_API_KEY and OPENAI_API_KEY_2 |
| Daily quota per key | 100,000 tokens (configurable) |
| Cache TTL | 5 minutes |
| Cache capacity | 500 entries |
| Cache key | SHA-256(model + messages + max_tokens) |
| Default token budget | 600 tokens/request |
| Memory per user | Last 10 turns per *session* (30-day TTL), isolated by session_id |

---

## 9. Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key (from [platform.openai.com](https://platform.openai.com))
- Google OAuth credentials (optional, for Google sign-in)

### 1. Clone the repository
```bash
git clone <repo-url>
cd "Financial Investment Assistant"
```

### 2. Backend setup

```powershell
cd backend

# Create and activate virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section below)
# Then start the server:
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Access the app

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

### 5. First run

1. Navigate to [http://localhost:5173](http://localhost:5173)
2. Register an account or sign in
3. Go to **Assets** -> Add your first asset
4. Return to **Dashboard** to see portfolio overview
5. Try **AI Chat** to ask about your portfolio
6. Try **AI Strategy** to generate a full AI analysis

---

## 10. Environment Variables

Create `backend/.env`:

```env
# Authentication
JWT_SECRET=your-random-secret-string-at-least-32-chars
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# Google OAuth (optional - skip if not using Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...your-primary-key...
OPENAI_API_KEY_2=sk-...your-secondary-key...
```

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | Random string for JWT signing (min 32 chars) |
| `FRONTEND_URL` | Yes | Frontend URL for OAuth CORS + redirect |
| `BACKEND_URL` | Yes | Backend URL for OAuth callback construction |
| `GOOGLE_CLIENT_ID` | No | Enables Google OAuth sign-in |
| `GOOGLE_CLIENT_SECRET` | No | Required if GOOGLE_CLIENT_ID is set |
| `LLM_MODEL` | Yes | OpenAI model ID (`gpt-4o-mini` recommended for cost) |
| `OPENAI_API_KEY` | Yes | Primary OpenAI API key |
| `OPENAI_API_KEY_2` | No | Secondary key for load balancing and redundancy |

> **Security note**: Never commit `.env` to version control. Add it to `.gitignore`.

---

## 11. Design Philosophy

### Dark-First UI
The interface uses a deep dark palette (`gray-950` -> `gray-900` -> `gray-800`) with vibrant accent colors per feature area (violet for AI/chat, emerald for performance, rose for risk, amber for strategy, sky for watchlist). This reduces eye strain during extended use and creates a professional financial-tool aesthetic.

### Agent Architecture: Focused Responsibility
Each agent has a single, narrow domain with a token-constrained system prompt (<300 tokens). Agents communicate through structured JSON output rather than free-form text, enabling reliable downstream parsing. The manager agent acts as a zero-cost router — no LLM call required for intent classification.

### Minimal Token Consumption
- Intent classification: 0 tokens (pure keyword scoring)
- LLM cache: deduplicates identical requests within 5 minutes at zero additional cost
- Memory injection: only last 10 turns (not full conversation history)
- Token budget enforced per request to prevent runaway costs
- Dual-key rotation distributes load and provides per-key quota tracking

### Progressive Enhancement
The app works in a degraded state without external APIs:
- Assets can be managed without real-time prices (falls back to buy price)
- Dashboard shows portfolio allocation without market data
- AI features degrade gracefully with clear user-facing error messages

### localStorage as First-Level Cache
Rather than a separate caching service, the app uses `localStorage` strategically for:
- Dashboard data (5-minute TTL, invalidated on asset mutations)
- AI Strategy results (persistent until user clicks "Regenerate")
- AI Chat sessions (permanent, user-managed lifecycle)

This eliminates redundant network calls and makes navigation feel instant while keeping the backend stateless.

---

## 12. Currency & FX Support

The platform supports multi-currency asset entry with automatic USD conversion for portfolio totals.

### Currency Mapping by Exchange

| Exchange | Currency | Symbol | Approx FX Rate (to USD) |
|---|---|---|---|
| US Stocks | USD | $ | 1.0 |
| HK Stocks | HKD | HK$ | ~0.1282 |
| A-Share (China) | CNY | ¥ | ~0.1380 |
| Domestic Fund | CNY | ¥ | ~0.1380 |
| International Fund | USD | $ | 1.0 |
| Crypto (Spot) | USD | $ | 1.0 |
| Gold (Spot) | USD | $ | 1.0 |
| Bonds | USD | $ | 1.0 |
| Forex | USD | $ | 1.0 |

### How It Works

1. **Form entry**: The price input label dynamically shows the correct currency code (e.g., "HKD") based on the selected exchange
2. **Storage**: Asset prices are stored in native currency (no conversion on write)
3. **Asset list**: Prices and values displayed in native currency using `Intl.NumberFormat`
4. **Dashboard totals**: Backend `portfolio_engine._to_usd()` converts all values to USD before summing
5. **FX rates**: Fetched live from `open.er-api.com` (free, no key) with 1-hour backend cache. Fallback to hardcoded values if API is unreachable. Frontend caches in `localStorage` for 1 hour.

> **Note**: For the most accurate FX rates in production, consider integrating a dedicated FX API (e.g., Fixer.io, Bloomberg FX) with minute-level granularity.

---

## 13. Authentication

### Email/Password
```
Register: email + password -> bcrypt(password, rounds=12) -> users table -> JWT (7d)
Login:    email + password -> verify bcrypt hash -> JWT (7d)
```

### Google OAuth
```
1. User clicks "Continue with Google"
2. Frontend redirects to /api/auth/google
3. Backend builds Google authorization URL, redirects browser
4. User consents on Google's page
5. Google redirects back to /api/auth/callback?code=xxx
6. Backend exchanges code for access token, fetches user profile
7. DB: upsert user record by google_id (creates on first login, updates on repeat)
8. Issues JWT, redirects to FRONTEND_URL/?token=xxx
9. AuthCallback.jsx: reads token from URL -> localStorage -> navigate to /
```

### Token Lifecycle
- JWT stored in `localStorage` as `ai_invest_token`
- Attached to every API request via axios request interceptor: `Authorization: Bearer <token>`
- On any 401 response: auto-logout, remove token, redirect to auth page

---

## 14. Performance Optimizations

| Optimization | Location | Benefit |
|---|---|---|
| Dashboard 5-min cache | `dashboardCache.js` + `Dashboard.jsx` | Eliminates 3 serial API calls on every navigation |
| LLM response cache | `agents/core/cache.py` | Zero additional tokens for repeated identical queries |
| AI Strategy localStorage | `AIStrategyPage.jsx` | Persists expensive multi-agent analysis across sessions |
| AI Chat localStorage | `AIChatPage.jsx` | All conversations local — no backend dependency |
| Parallel API calls | `Dashboard.jsx` `Promise.allSettled` | Concurrent assets + portfolio + risk fetches |
| Cache invalidation on write | `AssetList.jsx` | Dashboard refreshes after any asset change |
| Vite /api proxy | `vite.config.js` | No CORS preflight in development |
| Recharts explicit minHeight | All chart containers | Prevents layout recalculation + console warnings |
| Deterministic projection noise | `AIStrategyPage.jsx` | Seeded random = stable chart across re-renders |
| **Server-wide price cache** | `utils/price_cache.py` | 12 s TTL for WS ticker; 3 min TTL for portfolio P&L; last-known fallback on yfinance error; thread-safe (RLock) |
| **yfinance retry** | `external/stock_api.py` | Up to 3 attempts per symbol with 0.4 s linear backoff before falling back to cache |

---

## 15. Known Limitations & Roadmap

### Current Limitations
- **SQLite**: Not suitable for production multi-user scale; should migrate to PostgreSQL
- **Google OAuth**: Requires a real verified domain and configured OAuth consent screen for production
- **No mobile-responsive layout**: Designed primarily for desktop browsers

### Previously Fixed
| Issue | Resolution |
|---|---|
| Static FX rates | `fx_api.py` fetches live rates from open.er-api.com with 1-hour cache; fallback to hardcoded values on failure |
| No real-time market prices | WebSocket endpoint (`/api/ws/prices`) streams major index ticker updates every 15 s; frontend `useMarketWebSocket` hook with auto-reconnect; Vite HMR conflict resolved by direct-connecting to backend port in dev |
| Per-user global agent memory | `AgentMemory` now scoped to `(user_id, session_id)`; each chat session has isolated context; `DELETE /api/agent/memory?session_id=xxx` clears one session |
| yfinance rate limits / stale data | Server-wide `price_cache.py` (12 s TTL for ticker, 3 min for portfolio); individual per-symbol fetch with 2 retries + linear backoff; last-known-value fallback prevents null prices on transient failures |

### Roadmap
- [ ] PostgreSQL migration with Alembic schema migrations
- [ ] Portfolio value WebSocket streaming (price refresh for user assets on demand)
- [ ] Mobile-responsive layout improvements
- [ ] CSV/Excel export for assets and cashflows
- [ ] Semantic agent memory search (vector embeddings for long-term context retrieval)
- [ ] Additional LLM providers (Anthropic Claude, Google Gemini) via provider abstraction layer
- [ ] Portfolio backtesting module
- [ ] Tax lot tracking and capital gains reporting
- [ ] Automated FX rate alerts (notify when rate moves significantly)

---

## License

MIT — free to use for personal and commercial projects.

---

*Built with FastAPI · React · OpenAI GPT-4o-mini · SQLAlchemy · Recharts · Tailwind CSS*
