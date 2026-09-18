import json
import logging
import os
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from backend.static_ui import mount_ui

from backend.agent import StockDigestAgent

env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(logging.StreamHandler())

app = FastAPI(title="Tavily Stock Portfolio Researcher")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class StockDigestRequest(BaseModel):
    tickers: list[str]
    research_model: str = "mini"


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


def validate_request(data: StockDigestRequest):
    missing = missing_keys_error()
    if missing:
        raise HTTPException(status_code=401, detail=missing)
    if not data.tickers:
        raise HTTPException(status_code=400, detail="tickers must be a non-empty list")
    if data.research_model not in ("mini", "pro"):
        raise HTTPException(status_code=400, detail="research_model must be 'mini' or 'pro'")


@app.get("/health")
async def health():
    return {
        "ok": True,
        "hasTavilyKey": bool(os.getenv("TAVILY_API_KEY")),
        "hasOpenAIKey": bool(os.getenv("OPENAI_API_KEY")),
    }


@app.options("/api/stock-digest/stream")
async def preflight():
    response = JSONResponse(content=None, status_code=200)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


@app.post("/api/stock-digest")
async def analyze_stocks(data: StockDigestRequest):
    validate_request(data)
    try:
        agent = StockDigestAgent(research_model=data.research_model)
        final_state = await agent.run_digest(data.tickers)
        return final_state.model_dump()
    except HTTPException:
        raise
    except Exception as error:
        logger.error("Stock digest failed: %s", error, exc_info=True)
        raise HTTPException(status_code=500, detail="Research failed. Please retry.") from error


@app.post("/api/stock-digest/stream")
async def stream_stock_digest(data: StockDigestRequest, request: Request):
    validate_request(data)

    async def events():
        agent = StockDigestAgent(research_model=data.research_model)
        stream = agent.stream_digest(data.tickers)
        try:
            async for event in stream:
                if await request.is_disconnected():
                    break
                event_type = event.pop("type")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
        except Exception as error:
            logger.error("Stock digest stream failed: %s", error, exc_info=True)
            yield f"event: error\ndata: {json.dumps({'message': 'Research failed. Please retry.'})}\n\n"
        finally:
            await stream.aclose()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


mount_ui(app, Path(__file__).parent / "ui" / "dist")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
