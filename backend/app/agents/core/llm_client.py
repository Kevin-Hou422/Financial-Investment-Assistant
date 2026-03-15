"""
Token-budgeted LLM client.
Supports: OpenAI (gpt-4o-mini) and Ollama (local, free).
Token consumption is strictly capped per call via max_tokens.
JSON-mode is enforced so agents always get parseable output.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Tuple

import httpx

from config import LLM_MODEL, LLM_PROVIDER, OPENAI_API_KEY, OLLAMA_BASE_URL

log = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Exceptions
# ──────────────────────────────────────────────────────────────────────────────

class LLMError(Exception):
    """Raised when the LLM call fails or returns unparseable JSON."""


# ──────────────────────────────────────────────────────────────────────────────
# Client
# ──────────────────────────────────────────────────────────────────────────────

class LLMClient:
    """
    Thin async wrapper around OpenAI / Ollama.

    Usage:
        content, tokens = await llm_client.complete(messages, max_tokens=400)
    """

    def __init__(self) -> None:
        self.provider = LLM_PROVIDER   # "openai" | "ollama"
        self.model = LLM_MODEL
        self.api_key = OPENAI_API_KEY
        self.ollama_url = OLLAMA_BASE_URL

    # ── public ────────────────────────────────────────────────────────────────

    async def complete(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 400,
        temperature: float = 0.2,
    ) -> Tuple[Dict[str, Any], int]:
        """
        Returns (parsed_dict, tokens_used).
        max_tokens is the HARD upper bound sent to the API — limits cost/latency.
        JSON mode is always enabled so output is always a dict.
        """
        if self.provider == "openai":
            raw, tokens = await self._openai(messages, max_tokens, temperature)
        elif self.provider == "ollama":
            raw, tokens = await self._ollama(messages, max_tokens, temperature)
        else:
            raise LLMError(f"Unknown LLM_PROVIDER: {self.provider!r}")

        try:
            return json.loads(raw), tokens
        except json.JSONDecodeError as exc:
            log.warning("LLM returned non-JSON: %s", raw[:200])
            raise LLMError(f"LLM response is not valid JSON: {exc}") from exc

    # ── OpenAI ────────────────────────────────────────────────────────────────

    async def _openai(
        self,
        messages: List[Dict],
        max_tokens: int,
        temperature: float,
    ) -> Tuple[str, int]:
        if not self.api_key:
            raise LLMError(
                "OPENAI_API_KEY is not set. "
                "Add it to backend/.env or set LLM_PROVIDER=ollama."
            )
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "response_format": {"type": "json_object"},
                },
            )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        tokens = data["usage"]["total_tokens"]
        log.info("OpenAI %s | tokens=%d", self.model, tokens)
        return content, tokens

    # ── Ollama ────────────────────────────────────────────────────────────────

    async def _ollama(
        self,
        messages: List[Dict],
        max_tokens: int,
        temperature: float,
    ) -> Tuple[str, int]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(
                f"{self.ollama_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "num_predict": max_tokens,
                        "temperature": temperature,
                    },
                },
            )
        resp.raise_for_status()
        data = resp.json()
        content = data["message"]["content"]
        # Ollama eval_count ≈ output tokens
        tokens = data.get("eval_count", len(content.split()))
        log.info("Ollama %s | tokens≈%d", self.model, tokens)
        return content, tokens


# ── singleton ─────────────────────────────────────────────────────────────────
llm_client = LLMClient()
