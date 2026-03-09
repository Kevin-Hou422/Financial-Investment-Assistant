import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import FastAPI

from config import SCHEDULER_CACHE_FILE
from app.interfaces.agent_market_interface import get_market_snapshot
from app.interfaces.agent_portfolio_interface import get_current_portfolio
from app.interfaces.agent_risk_interface import get_risk_metrics


def _build_payload() -> Dict[str, Any]:
    return {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "market": get_market_snapshot(),
        "portfolio": get_current_portfolio(),
        "risk": get_risk_metrics(),
    }


async def _scheduler_loop() -> None:
    """
    每 5 分钟刷新一次：
    - 市场快照
    - 当前投资组合
    - 风险指标

    并将结果写入缓存文件，供未来扩展（如 Agent 或监控服务）使用。
    """
    # Give the API a moment to finish startup before the first refresh
    await asyncio.sleep(2)

    while True:
        # Run synchronous / network-heavy snapshot in a worker thread so it
        # won't block the event loop (and therefore won't prevent the server
        # from handling requests).
        payload = await asyncio.to_thread(_build_payload)
        try:
            with open(SCHEDULER_CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception:
            # 定时任务失败不应阻塞主服务，记录失败但继续重试
            pass

        await asyncio.sleep(300)  # 5 分钟


def setup_scheduler(app: FastAPI) -> None:
    """
    在 FastAPI 生命周期中挂载定时任务。
    """

    @app.on_event("startup")
    async def _start_scheduler() -> None:  # type: ignore[override]
        app.state.market_scheduler_task = asyncio.create_task(_scheduler_loop())

    @app.on_event("shutdown")
    async def _stop_scheduler() -> None:  # type: ignore[override]
        task = getattr(app.state, "market_scheduler_task", None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

