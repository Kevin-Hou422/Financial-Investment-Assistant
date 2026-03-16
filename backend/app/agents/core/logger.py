"""
AgentLogger — structured logging for the multi-agent system.

Writes one log record per agent call to:
  1. Python logging (INFO level) — visible in uvicorn output.
  2. An in-process SQLite table `agent_logs` — queryable via /agent/logs.

Schema:
  agent_logs(id, task_id, user_id, agent_name, intent, status,
             tokens_used, latency_ms, error, ts)
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.agents.core.base import AgentResult

log = logging.getLogger("agent_system")


def ensure_log_table(db: Session) -> None:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS agent_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id     TEXT,
            user_id     TEXT,
            agent_name  TEXT,
            intent      TEXT,
            status      TEXT,
            tokens_used INTEGER DEFAULT 0,
            latency_ms  INTEGER DEFAULT 0,
            error       TEXT,
            ts          REAL
        )
    """))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_log_user ON agent_logs(user_id, ts)"))
    db.commit()


class AgentLogger:
    """
    Structured logger bound to one request (user + task).

    Usage:
        logger = AgentLogger(db, user_id="u123")
        logger.record(result, intent="risk_analysis")
    """

    def __init__(self, db: Session, user_id: str) -> None:
        self._db = db
        self._uid = user_id
        try:
            ensure_log_table(db)
        except Exception:
            pass

    def record(self, result: AgentResult, intent: str = "") -> None:
        """Write one row to agent_logs and emit a structured INFO log line."""
        status_val = result.status.value if hasattr(result.status, "value") else str(result.status)

        # ── stdout log ────────────────────────────────────────────────────────
        log.info(
            "[agent] task=%s agent=%s intent=%s status=%s tokens=%d latency=%dms%s",
            result.task_id,
            result.agent_name,
            intent,
            status_val,
            result.tokens_used,
            result.latency_ms,
            f" error={result.error!r}" if result.error else "",
        )

        # ── DB record ─────────────────────────────────────────────────────────
        try:
            self._db.execute(text("""
                INSERT INTO agent_logs
                    (task_id, user_id, agent_name, intent, status,
                     tokens_used, latency_ms, error, ts)
                VALUES
                    (:task_id, :user_id, :agent_name, :intent, :status,
                     :tokens_used, :latency_ms, :error, :ts)
            """), {
                "task_id":     result.task_id,
                "user_id":     self._uid,
                "agent_name":  result.agent_name,
                "intent":      intent,
                "status":      status_val,
                "tokens_used": result.tokens_used,
                "latency_ms":  result.latency_ms,
                "error":       result.error,
                "ts":          time.time(),
            })
            self._db.commit()
        except Exception as exc:
            log.warning("AgentLogger.record DB write failed: %s", exc)

    @staticmethod
    def get_recent(db: Session, user_id: str, limit: int = 50):
        """Return recent log rows for a user (for /agent/logs endpoint)."""
        try:
            rows = db.execute(text("""
                SELECT task_id, agent_name, intent, status,
                       tokens_used, latency_ms, error, ts
                FROM agent_logs
                WHERE user_id = :uid
                ORDER BY ts DESC LIMIT :n
            """), {"uid": user_id, "n": limit}).fetchall()
            keys = ["task_id", "agent_name", "intent", "status",
                    "tokens_used", "latency_ms", "error", "ts"]
            return [dict(zip(keys, r)) for r in rows]
        except Exception:
            return []
