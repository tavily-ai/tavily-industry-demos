import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.static_ui import mount_ui

from backend.classes.state import emit_event, job_status
from backend.graph import Graph
from backend.services.pdf_service import PDFService

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())

app = FastAPI(title="Tavily Company Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
pdf_service = PDFService({"pdf_output_dir": "pdfs"})


class ResearchRequest(BaseModel):
    company: str
    company_url: str | None = None
    industry: str | None = None
    hq_location: str | None = None


class PDFGenerationRequest(BaseModel):
    report_content: str
    company_name: str | None = None


def missing_keys_error():
    has_tavily = bool(os.getenv("TAVILY_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    if has_tavily and has_openai:
        return None
    if not has_tavily and not has_openai:
        return "Set TAVILY_API_KEY and OPENAI_API_KEY in .env to start a live search."
    if not has_tavily:
        return "Set TAVILY_API_KEY in .env to start a live search."
    return "Set OPENAI_API_KEY in .env to start a live search."


@app.get("/health")
async def health():
    return {
        "ok": True,
        "hasTavilyKey": bool(os.getenv("TAVILY_API_KEY")),
        "hasOpenAIKey": bool(os.getenv("OPENAI_API_KEY")),
    }


@app.options("/research")
async def preflight():
    response = JSONResponse(content=None, status_code=200)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


@app.post("/research")
async def research(data: ResearchRequest, request: Request):
    missing = missing_keys_error()
    if missing:
        raise HTTPException(status_code=401, detail=missing)
    if not data.company.strip():
        raise HTTPException(status_code=400, detail="Company is required.")

    job_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    job_status[job_id].update({
        "status": "pending",
        "company": data.company,
        "last_update": datetime.now().isoformat(),
        "queue": queue,
        "events": [],
    })
    task = asyncio.create_task(process_research(job_id, data))

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=0.25)
                except TimeoutError:
                    if task.done() and queue.empty():
                        if not task.cancelled() and task.exception():
                            yield f"data: {json.dumps({'type': 'error', 'error': 'Research failed. Please retry.'})}\n\n"
                        break
                    yield ": keepalive\n\n"
                    continue
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") in {"complete", "error"}:
                    break
        finally:
            if not task.done():
                task.cancel()
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def process_research(job_id: str, data: ResearchRequest):
    try:
        logger.info("Starting research for %s", data.company)
        graph = Graph(
            company=data.company,
            url=data.company_url,
            industry=data.industry,
            hq_location=data.hq_location,
            job_id=job_id,
        )

        final_state = {}
        async for state in graph.run(thread={}):
            final_state.update(state)
            node_name = next(iter(state), "unknown")
            job_status[job_id].update({
                "status": "processing",
                "current_step": node_name,
                "last_update": datetime.now().isoformat(),
            })
            emit_event(job_id, {"type": "progress", "step": node_name})

        report_content = final_state.get("report") or (final_state.get("editor") or {}).get("report")
        if report_content:
            job_status[job_id].update({
                "status": "completed",
                "report": report_content,
                "company": data.company,
                "last_update": datetime.now().isoformat(),
            })
            emit_event(job_id, {"type": "complete", "report": report_content})
            logger.info("Research completed successfully for %s", data.company)
            return

        logger.error("Research completed without report. State keys: %s", list(final_state.keys()))
        job_status[job_id].update({
            "status": "failed",
            "error": "No report generated",
            "last_update": datetime.now().isoformat(),
        })
        emit_event(job_id, {"type": "error", "error": "No report generated"})
    except asyncio.CancelledError:
        job_status[job_id].update({
            "status": "cancelled",
            "last_update": datetime.now().isoformat(),
        })
        raise
    except Exception as error:
        logger.error("Research failed: %s", error, exc_info=True)
        message = "Research failed. Please retry."
        job_status[job_id].update({
            "status": "failed",
            "error": message,
            "last_update": datetime.now().isoformat(),
        })
        emit_event(job_id, {"type": "error", "error": message})


@app.post("/generate-pdf")
async def generate_pdf(data: PDFGenerationRequest):
    try:
        success, result = pdf_service.generate_pdf_stream(data.report_content, data.company_name)
        if success:
            pdf_buffer, filename = result
            return StreamingResponse(
                pdf_buffer,
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        raise HTTPException(status_code=500, detail=result)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


mount_ui(app, Path(__file__).parent / "ui" / "dist")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
