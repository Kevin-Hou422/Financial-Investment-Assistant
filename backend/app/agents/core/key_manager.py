"""
KeyManager — dual OpenAI API key manager.

Features:
  • Random load-balancing between two keys per request
  • Per-key daily token quota (resets at UTC midnight)
  • Automatic failover: when key A is exhausted, key B takes over
  • Usage persisted in SQLite table `api_key_usage` for cross-restart accuracy
  • Thread-safe via asyncio.Lock

Configuration (backend/.env):
    OPENAI_API_KEY=sk-...          # key A (required)
    OPENAI_API_KEY_2=sk-...        # key B (optional; set "" to disable)
    OPENAI_DAILY_TOKEN_LIMIT=100000  # per-key daily cap (0 = unlimited)
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import random
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from config import OPENAI_API_KEY, OPENAI_API_KEY_2, OPENAI_DAILY_TOKEN_LIMIT

log = logging.getLogger(__name__)


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _hash_key(key: str) -> str:
    """Store only a hash of the key in DB — never the raw secret."""
    return hashlib.sha256(key.encode()).hexdigest()[:16]


# ── DB helpers ────────────────────────────────────────────────────────────────

def ensure_usage_table(db: Session) -> None:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS api_key_usage (
            key_hash  TEXT NOT NULL,
            date      TEXT NOT NULL,
            tokens    INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (key_hash, date)
        )
    """))
    db.commit()


def _load_usage(db: Session, key_hash: str, date: str) -> int:
    row = db.execute(text("""
        SELECT tokens FROM api_key_usage WHERE key_hash=:h AND date=:d
    """), {"h": key_hash, "d": date}).fetchone()
    return row[0] if row else 0


def _add_usage(db: Session, key_hash: str, date: str, tokens: int) -> None:
    db.execute(text("""
        INSERT INTO api_key_usage (key_hash, date, tokens)
        VALUES (:h, :d, :t)
        ON CONFLICT(key_hash, date) DO UPDATE SET tokens = tokens + :t
    """), {"h": key_hash, "d": date, "t": tokens})
    db.commit()


# ── KeyManager ────────────────────────────────────────────────────────────────

class KeyManager:
    """
    Manages up to two OpenAI API keys with per-key daily token quotas.

    Usage:
        key = key_manager.pick(db)         # select available key
        key_manager.record(db, key, 350)   # record tokens used
    """

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._keys: List[Tuple[str, str]] = []  # [(raw_key, key_hash), ...]
        self._limit = OPENAI_DAILY_TOKEN_LIMIT
        self._in_memory: Dict[str, int] = {}   # key_hash → tokens today (fast path)

        for raw in [OPENAI_API_KEY, OPENAI_API_KEY_2]:
            if raw and raw.strip():
                self._keys.append((raw.strip(), _hash_key(raw.strip())))

        if not self._keys:
            log.warning("KeyManager: no OpenAI API keys configured.")

    # ── public ────────────────────────────────────────────────────────────────

    def pick(self, db: Optional[Session] = None) -> str:
        """
        Return a usable API key, randomly chosen from those under quota.
        Raises RuntimeError if all keys are exhausted.
        """
        if not self._keys:
            raise RuntimeError(
                "No OpenAI API keys configured. "
                "Set OPENAI_API_KEY in backend/.env"
            )

        today = _today_utc()
        available = []

        for raw, key_hash in self._keys:
            if self._limit == 0:
                available.append(raw)
                continue
            used = self._in_memory.get(key_hash, 0)
            # Fast path: in-memory count
            if used < self._limit:
                available.append(raw)
                continue
            # Slow path: check DB (catches cross-restart usage)
            if db:
                try:
                    db_used = _load_usage(db, key_hash, today)
                    self._in_memory[key_hash] = db_used  # sync
                    if db_used < self._limit:
                        available.append(raw)
                        continue
                except Exception:
                    available.append(raw)   # DB unavailable → optimistic
            log.warning(
                "KeyManager: key %s...%s hit daily limit (%d tokens)",
                raw[:8], raw[-4:], self._limit,
            )

        if not available:
            raise RuntimeError(
                f"All OpenAI API keys have reached the daily token limit "
                f"({self._limit:,} tokens). Try again tomorrow (UTC)."
            )

        chosen = random.choice(available)
        if len(available) < len(self._keys):
            log.info("KeyManager: using fallback key (primary exhausted).")
        return chosen

    def record(self, tokens: int, key: str, db: Optional[Session] = None) -> None:
        """Record token usage for the given key."""
        if not key:
            return
        key_hash = _hash_key(key)
        today = _today_utc()
        self._in_memory[key_hash] = self._in_memory.get(key_hash, 0) + tokens
        if db:
            try:
                ensure_usage_table(db)
                _add_usage(db, key_hash, today, tokens)
            except Exception as exc:
                log.warning("KeyManager.record DB write failed: %s", exc)

    def usage_report(self, db: Optional[Session] = None) -> List[Dict]:
        """Returns usage summary for all configured keys."""
        today = _today_utc()
        result = []
        for raw, key_hash in self._keys:
            used = self._in_memory.get(key_hash, 0)
            if db:
                try:
                    used = max(used, _load_usage(db, key_hash, today))
                except Exception:
                    pass
            result.append({
                "key_suffix": f"...{raw[-4:]}",
                "date": today,
                "tokens_used": used,
                "daily_limit": self._limit,
                "remaining": max(0, self._limit - used) if self._limit else "unlimited",
                "exhausted": self._limit > 0 and used >= self._limit,
            })
        return result

    @property
    def key_count(self) -> int:
        return len(self._keys)


# ── process-level singleton ────────────────────────────────────────────────────
key_manager = KeyManager()
