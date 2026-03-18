"""
AgentMemory — per-user, per-session persistent conversation context.

Each chat session gets its own memory lane, identified by session_id.
Memory with session_id='' uses the legacy global-per-user lane (backward compat).

Storage schema:
  agent_memory(id, user_id TEXT, session_id TEXT, role TEXT, content TEXT, ts REAL)

TTL: entries older than MEMORY_TTL_DAYS are pruned on each write.
Window: only the last MEMORY_MAX_TURNS turns are loaded per (user, session).
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

log = logging.getLogger(__name__)

MEMORY_MAX_TURNS = 10
MEMORY_TTL_DAYS  = 30


def ensure_memory_table(db: Session) -> None:
    """Create or migrate the memory table (idempotent)."""
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS agent_memory (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    TEXT    NOT NULL,
            session_id TEXT    NOT NULL DEFAULT '',
            role       TEXT    NOT NULL,
            content    TEXT    NOT NULL,
            ts         REAL    NOT NULL
        )
    """))
    # Migrate: add session_id column if it doesn't exist yet
    try:
        db.execute(text("ALTER TABLE agent_memory ADD COLUMN session_id TEXT NOT NULL DEFAULT ''"))
        db.commit()
    except Exception:
        pass  # column already exists

    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_mem_user    ON agent_memory(user_id, ts)"
    ))
    db.execute(text(
        "CREATE INDEX IF NOT EXISTS idx_mem_session ON agent_memory(user_id, session_id, ts)"
    ))
    db.commit()


class AgentMemory:
    """
    Per-request memory handle for one user + one session.

    Usage:
        memory = AgentMemory(db, user_id, session_id="chat-abc")
        history = memory.load()
        memory.save("user",      message)
        memory.save("assistant", reply)
        memory.clear()       # clears this session only
        memory.clear_all()   # clears ALL sessions for this user
    """

    def __init__(self, db: Session, user_id: str, session_id: str = "") -> None:
        self._db  = db
        self._uid = user_id
        self._sid = session_id or ""
        try:
            ensure_memory_table(db)
        except Exception:
            pass

    # ── public ────────────────────────────────────────────────────────────────

    def load(self) -> List[Dict[str, str]]:
        """
        Returns the last MEMORY_MAX_TURNS turns for this (user, session), oldest first.
        """
        try:
            rows = self._db.execute(text("""
                SELECT role, content FROM agent_memory
                WHERE user_id = :uid AND session_id = :sid
                ORDER BY ts DESC
                LIMIT :n
            """), {"uid": self._uid, "sid": self._sid, "n": MEMORY_MAX_TURNS}).fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]
        except Exception as exc:
            log.warning("AgentMemory.load failed: %s", exc)
            return []

    def save(self, role: str, content: str) -> None:
        """Append one turn and prune old/expired entries for this session."""
        try:
            now    = time.time()
            cutoff = now - MEMORY_TTL_DAYS * 86400
            self._db.execute(text("""
                INSERT INTO agent_memory (user_id, session_id, role, content, ts)
                VALUES (:uid, :sid, :role, :content, :ts)
            """), {"uid": self._uid, "sid": self._sid,
                   "role": role, "content": content[:2000], "ts": now})
            # Prune expired for this session
            self._db.execute(text("""
                DELETE FROM agent_memory
                WHERE user_id = :uid AND session_id = :sid AND ts < :cutoff
            """), {"uid": self._uid, "sid": self._sid, "cutoff": cutoff})
            # Keep only the most recent MAX_TURNS*2 rows for this session
            self._db.execute(text("""
                DELETE FROM agent_memory
                WHERE user_id = :uid AND session_id = :sid
                  AND id NOT IN (
                      SELECT id FROM agent_memory
                      WHERE user_id = :uid AND session_id = :sid
                      ORDER BY ts DESC
                      LIMIT :n
                  )
            """), {"uid": self._uid, "sid": self._sid, "n": MEMORY_MAX_TURNS * 2})
            self._db.commit()
        except Exception as exc:
            log.warning("AgentMemory.save failed: %s", exc)

    def clear(self) -> None:
        """Wipe memory for this (user, session) only."""
        try:
            self._db.execute(text("""
                DELETE FROM agent_memory
                WHERE user_id = :uid AND session_id = :sid
            """), {"uid": self._uid, "sid": self._sid})
            self._db.commit()
        except Exception as exc:
            log.warning("AgentMemory.clear failed: %s", exc)

    def clear_all(self) -> None:
        """Wipe ALL sessions' memory for this user."""
        try:
            self._db.execute(text(
                "DELETE FROM agent_memory WHERE user_id = :uid"
            ), {"uid": self._uid})
            self._db.commit()
        except Exception as exc:
            log.warning("AgentMemory.clear_all failed: %s", exc)
