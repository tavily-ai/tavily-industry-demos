"""Morning Watchlist runner — screens the client roster with bounded parallelism."""

import asyncio
import json
import logging
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, List, Optional

from backend.agents.screening import build_screening_agent, client_task
from backend.audit import AuditTrail
from backend.db import save_run
from backend.streaming.agent_stream import stream_agent_run

logger = logging.getLogger(__name__)

ROSTER_PATH = Path(__file__).parent / "data" / "roster.json"
MAX_CONCURRENT = 4


def load_roster() -> List[Dict[str, Any]]:
    with open(ROSTER_PATH) as f:
        return json.load(f)["clients"]


async def _screen_one(
    agent: Any,
    client: Dict[str, Any],
    audit: AuditTrail,
    queue: asyncio.Queue,
    semaphore: asyncio.Semaphore,
) -> None:
    client_id = client["id"]
    async with semaphore:
        await queue.put({"type": "client_start", "client_id": client_id, "client": client})
        try:
            async for event in stream_agent_run(
                agent=agent,
                task=client_task(client),
                audit=audit,
                client_id=client_id,
            ):
                event["client"] = client
                await queue.put(event)
        except Exception as e:
            logger.exception("screening failed for %s", client_id)
            await queue.put({"type": "error", "client_id": client_id, "client": client, "message": str(e)})
        finally:
            await queue.put({"type": "client_done", "client_id": client_id})


async def run_watchlist(max_clients: Optional[int] = None) -> AsyncGenerator[str, None]:
    """Screen every roster client, merging per-client agent events into one SSE stream."""
    run_id = f"watchlist-{uuid.uuid4().hex[:8]}"
    audit = AuditTrail(run_id, kind="watchlist")
    clients = load_roster()
    if max_clients:
        clients = clients[:max_clients]

    started = time.time()
    yield _sse({"type": "start", "run_id": run_id, "clients": clients})

    audit.record("watchlist_start", client_count=len(clients))
    agent = build_screening_agent()

    queue: asyncio.Queue = asyncio.Queue()
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    tasks = [
        asyncio.create_task(_screen_one(agent, client, audit, queue, semaphore))
        for client in clients
    ]

    remaining = len(tasks)
    results: Dict[str, Any] = {}

    while remaining > 0:
        event = await queue.get()
        etype = event.get("type")
        if etype == "client_done":
            remaining -= 1
            continue
        if etype == "result":
            results[event["client_id"]] = {
                "client": event["client"],
                "verdict": event["data"],
                "elapsed_s": event.get("elapsed_s"),
            }
        yield _sse(event)

    await asyncio.gather(*tasks, return_exceptions=True)

    elapsed = round(time.time() - started, 2)
    counts = {"clear": 0, "review": 0, "escalate": 0, "error": 0}
    for r in results.values():
        counts[r["verdict"].get("verdict", "error")] = counts.get(r["verdict"].get("verdict", "error"), 0) + 1
    counts["error"] += len(clients) - len(results)

    audit.record("watchlist_complete", elapsed_s=elapsed, counts=counts)
    log_path = audit.flush()

    save_run(
        run_id,
        kind="watchlist",
        elapsed_s=elapsed,
        counts=counts,
        payload={"results": results, "audit_log": str(log_path)},
    )

    yield _sse({
        "type": "complete",
        "run_id": run_id,
        "elapsed_s": elapsed,
        "counts": counts,
        "results": results,
        "audit_log": str(log_path),
    })


def _sse(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload)}\n\n"
