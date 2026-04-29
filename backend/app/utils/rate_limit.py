"""
Sliding-window rate limiter — no external dependencies.

Suitable for single-process deployments (SQLite / local dev).
For multi-process production replace _store with a Redis backend.
"""
from __future__ import annotations

import time
import threading
from collections import deque
from typing import Deque, Dict


class SlidingWindowRateLimiter:
    """
    Tracks call timestamps per key in a deque.
    Thread-safe; O(1) amortised per check.
    """

    def __init__(self, max_calls: int, window_seconds: int) -> None:
        self._max = max_calls
        self._window = window_seconds
        self._store: Dict[str, Deque[float]] = {}
        self._lock = threading.Lock()

    def is_allowed(self, key: str) -> bool:
        """Return True and record the call if within quota, False otherwise."""
        now = time.monotonic()
        cutoff = now - self._window
        with self._lock:
            dq = self._store.setdefault(key, deque())
            while dq and dq[0] < cutoff:
                dq.popleft()
            if len(dq) >= self._max:
                return False
            dq.append(now)
            return True

    def remaining(self, key: str) -> int:
        """How many calls the key can still make in the current window."""
        now = time.monotonic()
        cutoff = now - self._window
        with self._lock:
            dq = self._store.get(key)
            if dq is None:
                return self._max
            used = sum(1 for ts in dq if ts >= cutoff)
            return max(0, self._max - used)


# ── Shared limiter instances ───────────────────────────────────────────────────
# Agent chat is the most expensive endpoint (LLM calls + DB writes).
# 20 req/min per user is generous for interactive use while blocking abuse.
agent_chat_limiter = SlidingWindowRateLimiter(max_calls=20, window_seconds=60)
