"""FastAPI server for the AML/KYC compliance workbench."""

import json
import logging
import os
import sys
import time
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

backend_dir = Path(__file__).parent
project_dir = backend_dir.parent
if str(project_dir) not in sys.path:
    sys.path.insert(0, str(project_dir))

from backend.agents.investigation import build_investigation_agent, investigation_task
from backend.audit import AuditTrail
from backend.db import get_run, list_runs, save_run
from backend.models import InvestigateRequest, WatchlistRequest
from backend.streaming.agent_stream import stream_agent_run
from backend.watchlist import run_watchlist

load_dotenv(project_dir / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AML/KYC Compliance Workbench",
    description="Evidence-first adverse media monitoring and enhanced due diligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
}


@app.get("/")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/roster")
async def get_roster():
    from backend.watchlist import load_roster

    return {"clients": load_roster()}


@app.post("/api/watchlist/stream")
async def watchlist_stream(request: WatchlistRequest):
    """Run the daily watchlist screening, streaming per-client agent events as SSE."""
    logger.info("watchlist run requested (max_clients=%s)", request.max_clients)
    return StreamingResponse(
        run_watchlist(max_clients=request.max_clients),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )


@app.post("/api/investigate/stream")
async def investigate_stream(request: InvestigateRequest):
    """Run one enhanced due diligence investigation, streaming agent events as SSE."""
    case_id = f"case-{uuid.uuid4().hex[:8]}"
    logger.info("investigation requested: %s (case %s)", request.query, case_id)

    async def event_stream():
        audit = AuditTrail(case_id, kind="investigation")
        started = time.time()
        yield f'data: {json.dumps({"type": "start", "case_id": case_id, "query": request.query})}\n\n'
        audit.record("case_start", query=request.query, flag_context=request.flag_context)

        agent = build_investigation_agent()
        case_file = None
        async for event in stream_agent_run(
            agent=agent,
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
        yield f'data: {json.dumps({"type": "complete", "case_id": case_id, "elapsed_s": elapsed, "audit_log": str(log_path)})}\n\n'

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=SSE_HEADERS)


@app.get("/api/runs")
async def list_run_history(kind: str = None, limit: int = 50):
    """List past runs (metadata only), newest first."""
    return {"runs": list_runs(kind=kind, limit=limit)}


@app.get("/api/runs/{run_id}")
async def get_run_detail(run_id: str):
    """Fetch one past run with its full results payload."""
    run = get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    return run


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
