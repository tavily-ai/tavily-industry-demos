"""Compliance API routes, including migration aliases."""

import json
import logging
import time
import uuid

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.core.audit import AuditTrail
from backend.core.db import save_run
from backend.core.streaming.agent_stream import stream_agent_run
from .investigation import build_investigation_agent, investigation_task
from .models import InvestigateRequest, WatchlistRequest
from .watchlist import load_roster, run_watchlist

logger = logging.getLogger(__name__)
router = APIRouter(tags=["compliance"])
SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@router.get("/api/compliance/roster")
@router.get("/api/roster", include_in_schema=False)
async def get_roster():
    return {"clients": load_roster()}


@router.post("/api/compliance/watchlist/stream")
@router.post("/api/watchlist/stream", include_in_schema=False)
async def watchlist_stream(request: WatchlistRequest):
    logger.info("watchlist run requested (max_clients=%s)", request.max_clients)
    return StreamingResponse(
        run_watchlist(max_clients=request.max_clients),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@router.post("/api/compliance/investigate/stream")
@router.post("/api/investigate/stream", include_in_schema=False)
async def investigate_stream(request: InvestigateRequest):
    case_id = f"case-{uuid.uuid4().hex[:8]}"

    async def event_stream():
        audit = AuditTrail(case_id, kind="investigation")
        started = time.time()
        yield f"data: {json.dumps({'type': 'start', 'case_id': case_id, 'query': request.query})}\n\n"
        audit.record(
            "case_start", query=request.query, flag_context=request.flag_context
        )
        case_file = None
        async for event in stream_agent_run(
            agent=build_investigation_agent(),
            task=investigation_task(request.query, request.flag_context),
            audit=audit,
        ):
            if event.get("type") == "result":
                case_file = event.get("data")
            yield f"data: {json.dumps(event)}\n\n"
        elapsed = round(time.time() - started, 2)
        log_path = audit.flush()
        save_run(
            case_id,
            kind="investigation",
            query=request.query,
            elapsed_s=elapsed,
            payload={
                "case_file": case_file,
                "flag_context": request.flag_context,
                "audit_log": str(log_path),
            },
        )
        yield f"data: {json.dumps({'type': 'complete', 'case_id': case_id, 'elapsed_s': elapsed, 'audit_log': str(log_path)})}\n\n"

    return StreamingResponse(
        event_stream(), media_type="text/event-stream", headers=SSE_HEADERS
    )
