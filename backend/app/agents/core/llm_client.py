"""
Token-budgeted LLM client with dual-key management and response cache.

Supports:
  • OpenAI  — randomly selects between KEY_A / KEY_B; tracks daily usage
  • Ollama  — local, free, no key required

JSON-mode enforced on all calls so agents always receive parseable output.
Cache hit → 0 tokens charged, 0 API calls made.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

import httpx

from config import LLM_MODEL, LLM_PROVIDER, OLLAMA_BASE_URL
from app.agents.core.cache import llm_cache
from app.agents.core.key_manager import key_manager

log = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when the LLM call fails or returns unparseable JSON."""


class LLMClient:
    """
    Thin async wrapper around OpenAI / Ollama.

    Returns (parsed_dict, tokens_used).
    tokens_used == 0 on a cache hit.

    Pass db= to enable per-key daily token tracking in SQLite.
    """

    def __init__(self) -> None:
        self.provider = LLM_PROVIDER
        self.model    = LLM_MODEL
        self.ollama_url = OLLAMA_BASE_URL

    async def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 400,
        temperature: float = 0.2,
        use_cache: bool = True,
        db=None,                     # optional Session for token tracking
    ) -> Tuple[Dict[str, Any], int]:
        """
        Returns (parsed_dict, tokens_used).
        max_tokens is the HARD per-call upper bound.
        """
        cache_key = llm_cache.make_key(self.model, messages, max_tokens)

        if use_cache:
            cached = llm_cache.get(cache_key)
            if cached is not None:
                return cached   # (dict, 0) — no tokens charged

        if self.provider == "openai":
            raw, tokens, used_key = await self._openai(messages, max_tokens, temperature, db)
            if used_key and tokens:
                key_manager.record(tokens, used_key, db)
        elif self.provider == "ollama":
            raw, tokens, used_key = await self._ollama(messages, max_tokens, temperature)
        else:
            raise LLMError(f"Unknown LLM_PROVIDER: {self.provider!r}")

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            log.warning("LLM returned non-JSON: %s", raw[:300])
            raise LLMError(f"LLM response is not valid JSON: {exc}") from exc

        result = (parsed, tokens)
        if use_cache:
            llm_cache.set(cache_key, result)
        return result

    # ── OpenAI ────────────────────────────────────────────────────────────────

    async def _openai(
        self,
        messages: List[Dict],
        max_tokens: int,
        temperature: float,
        db=None,
    ) -> Tuple[str, int, str]:
        """Returns (raw_json_str, tokens_used, api_key_used)."""
        api_key = key_manager.pick(db)   # random key selection + quota check
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model":           self.model,
                    "messages":        messages,
                    "max_tokens":      max_tokens,
                    "temperature":     temperature,
                    "response_format": {"type": "json_object"},
                },
            )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        tokens  = data["usage"]["total_tokens"]
        log.info("OpenAI %s | tokens=%d | key=...%s", self.model, tokens, api_key[-4:])
        return content, tokens, api_key

    # ── Ollama ────────────────────────────────────────────────────────────────

    async def _ollama(
        self,
        messages: List[Dict],
        max_tokens: int,
        temperature: float,
    ) -> Tuple[str, int, str]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model":   self.model,
                    "messages": messages,
                    "stream":  False,
                    "format":  "json",
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": temperature,
                    },
                },
            )
        resp.raise_for_status()
        data    = resp.json()
        content = data["message"]["content"]
        tokens  = data.get("eval_count", len(content.split()))
        log.info("Ollama %s | tokens≈%d", self.model, tokens)
        return content, tokens, ""


# ── singleton ─────────────────────────────────────────────────────────────────
llm_client = LLMClient()
