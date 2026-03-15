"""
Core data structures for the agent system.
AgentTask → BaseAgent.run() → AgentResult
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class AgentTask:
    """Unit of work dispatched to a single agent."""
    task_id: str
    agent_name: str
    intent: str                              # raw user query or intent label
    context: Dict[str, Any] = field(default_factory=dict)
    token_budget: int = 600                  # hard cap: LLM max_tokens for this task
    created_at: float = field(default_factory=time.time)


@dataclass
class AgentResult:
    """Structured response from an agent."""
    task_id: str
    agent_name: str
    status: AgentStatus
    output: Dict[str, Any] = field(default_factory=dict)
    tokens_used: int = 0
    latency_ms: int = 0
    error: Optional[str] = None


class BaseAgent:
    """All agents inherit from this. One async run() method — nothing else."""
    name: str = "base_agent"
    description: str = ""

    async def run(self, task: AgentTask, tools: Any) -> AgentResult:
        raise NotImplementedError(f"{self.__class__.__name__}.run() not implemented")
