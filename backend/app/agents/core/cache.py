"""
LLMCache — hash-based in-process cache for LLM responses.

Prevents identical LLM calls from being made twice within the TTL window.
Cache key = SHA256(model + sorted_messages + max_tokens).
Storage: plain dict in process memory (no persistence — clears on restart).

For production scale, swap _store for Redis with:
    await redis.setex(key, ttl, json.dumps(value))
"""
from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300   # 5 minutes — adjust as needed
CACHE_MAX_ENTRIES = 500   # hard cap to prevent unbounded memory growth


class LLMCache:
    """
    Thread-safe (GIL) in-memory LLM response cache.

    Usage:
        cache = LLMCache()

        key = cache.make_key(model, messages, max_tokens)
        hit = cache.get(key)
        if hit:
            return hit
        result = await llm_call(...)
        cache.set(key, result)
    """

    def __init__(self) -> None:
        # {key: (value, expire_at)}
        self._store: Dict[str, Tuple[Any, float]] = {}

    # ── public ────────────────────────────────────────────────────────────────

    @staticmethod
    def make_key(model: str, messages: List[Dict], max_tokens: int) -> str:
        payload = json.dumps(
            {"model": model, "messages": messages, "max_tokens": max_tokens},
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode()).hexdigest()[:32]

    def get(self, key: str) -> Optional[Tuple[Dict[str, Any], int]]:
        """Returns (parsed_dict, tokens) if cache hit, else None."""
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expire_at = entry
        if time.monotonic() > expire_at:
            del self._store[key]
            log.debug("LLMCache expired: %s", key[:8])
            return None
        log.debug("LLMCache hit: %s", key[:8])
        return value

    def set(self, key: str, value: Tuple[Dict[str, Any], int]) -> None:
        """Store a result. Evicts oldest entries when cap is reached."""
        if len(self._store) >= CACHE_MAX_ENTRIES:
            self._evict()
        self._store[key] = (value, time.monotonic() + CACHE_TTL_SECONDS)
        log.debug("LLMCache set: %s (size=%d)", key[:8], len(self._store))

    def invalidate(self, key: str) -> None:
        self._store.pop(key, None)

    def clear(self) -> None:
        self._store.clear()

    def stats(self) -> Dict[str, int]:
        now = time.monotonic()
        live = sum(1 for _, exp in self._store.values() if exp > now)
        return {"total": len(self._store), "live": live, "expired": len(self._store) - live}

    # ── internal ──────────────────────────────────────────────────────────────

    def _evict(self) -> None:
        """Remove the oldest 20% of entries."""
        n = max(1, len(self._store) // 5)
        oldest = sorted(self._store.items(), key=lambda kv: kv[1][1])[:n]
        for k, _ in oldest:
            del self._store[k]
        log.debug("LLMCache evicted %d entries", n)


# ── process-level singleton ────────────────────────────────────────────────────
llm_cache = LLMCache()
