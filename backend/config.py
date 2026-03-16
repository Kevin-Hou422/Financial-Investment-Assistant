import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Legacy JSON paths (kept for backward compat with old interfaces/scheduler) ─
DB_FILE   = os.getenv("DB_FILE",   os.path.join(BASE_DIR, "assets.json"))
PREF_FILE = os.getenv("PREF_FILE", os.path.join(BASE_DIR, "preferences.json"))
SCHEDULER_CACHE_FILE = os.path.join(BASE_DIR, "scheduler_cache.json")

# ── SQLite / PostgreSQL database ──────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{os.path.join(BASE_DIR, 'app_data.db')}",
)

# ── JWT ───────────────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-please-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

# ── Google OAuth 2.0 ──────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# ── URLs ──────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL  = os.getenv("BACKEND_URL",  "http://localhost:8000")

# ── Multi-Agent LLM settings ──────────────────────────────────────────────────
# LLM_PROVIDER: "openai" (default) or "ollama" (free, local)
LLM_PROVIDER    = os.getenv("LLM_PROVIDER",    "openai")
# OpenAI: use gpt-4o-mini for best cost/quality ratio
# Ollama:  use any locally-pulled model, e.g. "llama3", "mistral"
LLM_MODEL       = os.getenv("LLM_MODEL",       "gpt-4o-mini")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL",  "http://localhost:11434")

# ── Dual OpenAI API keys ───────────────────────────────────────────────────────
# Both keys are randomly load-balanced.  When one exceeds its daily quota the
# other takes over automatically.  Set OPENAI_API_KEY_2="" to use single-key.
OPENAI_API_KEY   = os.getenv("OPENAI_API_KEY",   "")
OPENAI_API_KEY_2 = os.getenv("OPENAI_API_KEY_2", "")

# Tokens per key per UTC calendar day (0 = unlimited)
OPENAI_DAILY_TOKEN_LIMIT = int(os.getenv("OPENAI_DAILY_TOKEN_LIMIT", "100000"))
