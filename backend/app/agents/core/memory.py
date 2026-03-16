"""
AgentMemory — per-user persistent conversation context.

Stores the last N conversation turns per user in SQLite via a dedicated table.
Agents read memory to build richer prompts without repeating full history in
every call (only the compact summary is injected → minimal extra tokens).

Storage schema (in-process SQLite, same DB as the main app):
  agent_memory(user_id TEXT, role TEXT, content TEXT, ts REAL)

TTL: entries older than MEMORY_TTL_DAYS are pruned on each write.
Window: only the last MEMORY_MAX_TURNS turns are loaded per user.
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List

from sqlalchemy import text
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

MEMORY_MAX_TURNS = 10    # max conversation turns kept per user
MEMORY_TTL_DAYS  = 30   # entries older than this are pruned


def ensure_memory_table(db: Session) -> None:
    """Create the memory table if it doesn't exist (idempotent)."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS agent_memory (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id  TEXT    NOT NULL,
            role     TEXT    NOT NULL,
            content  TEXT    NOT NULL,
            ts       REAL    NOT NULL
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_mem_user ON agent_memory(user_id, ts)"))
    db.commit()


class AgentMemory:
    """
    Per-request memory handle for one user.

    Usage inside an agent:
        memory = AgentMemory(db, user_id)
        history = memory.load()           # List[{"role": ..., "content": ...}]
        memory.save("user",    message)
        memory.save("assistant", reply)
    """

    def __init__(self, db: Session, user_id: str) -> None:
        self._db = db
        self._uid = user_id
        try:
            ensure_memory_table(db)
        except Exception:
            pass  # table already exists or DB is read-only — silently continue

    # ── public ────────────────────────────────────────────────────────────────

    def load(self) -> List[Dict[str, str]]:
        """
        Returns the last MEMORY_MAX_TURNS turns as chat message dicts.
        Oldest first so they can be prepended to an LLM messages list directly.
        """
        try:
            rows = self._db.execute(text("""
                SELECT role, content FROM agent_memory
                WHERE user_id = :uid
                ORDER BY ts DESC
                LIMIT :n
            """), {"uid": self._uid, "n": MEMORY_MAX_TURNS}).fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as exc:
            log.warning("AgentMemory.load failed: %s", exc)
            return []

    def save(self, role: str, content: str) -> None:
        """Append one turn and prune old entries."""
        try:
            now = time.time()
            cutoff = now - MEMORY_TTL_DAYS * 86400
            self._db.execute(text("""
                INSERT INTO agent_memory (user_id, role, content, ts)
                VALUES (:uid, :role, :content, :ts)
            """), {"uid": self._uid, "role": role, "content": content[:2000], "ts": now})
            # Prune expired entries for this user
            self._db.execute(text("""
                DELETE FROM agent_memory WHERE user_id = :uid AND ts < :cutoff
            """), {"uid": self._uid, "cutoff": cutoff})
            # Keep only the most recent MEMORY_MAX_TURNS*2 rows per user
            self._db.execute(text("""
                DELETE FROM agent_memory WHERE user_id = :uid AND id NOT IN (
                    SELECT id FROM agent_memory
                    WHERE user_id = :uid
                    ORDER BY ts DESC
                    LIMIT :n
                )
            """), {"uid": self._uid, "n": MEMORY_MAX_TURNS * 2})
            self._db.commit()
        except Exception as exc:
            log.warning("AgentMemory.save failed: %s", exc)

    def clear(self) -> None:
        """Wipe all memory for this user (e.g., on explicit reset)."""
        try:
            self._db.execute(text(
                "DELETE FROM agent_memory WHERE user_id = :uid"
            ), {"uid": self._uid})
            self._db.commit()
        except Exception as exc:
            log.warning("AgentMemory.clear failed: %s", exc)
