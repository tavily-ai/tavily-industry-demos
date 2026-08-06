"""Investment research API routes."""

import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.modules.compliance.router import SSE_HEADERS
from .schemas import InvestmentResearchRequest
from .workflow import stream_investment_research

router = APIRouter(tags=["investment-research"])


@router.post("/api/investment-research/stream")
async def investment_research_stream(request: InvestmentResearchRequest):
    if not (os.getenv("TAVILY_API_KEY") or "").strip():
        raise HTTPException(status_code=503, detail="TAVILY_API_KEY is not configured")
    return StreamingResponse(
        stream_investment_research(request),
        media_type="text/event-stream",
        headers=SSE_HEADERS,
    )
