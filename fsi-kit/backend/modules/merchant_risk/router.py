"""Merchant risk API routes."""
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from backend.modules.compliance.router import SSE_HEADERS
from .schemas import MerchantRiskRequest
from .workflow import stream_merchant_risk
router = APIRouter(tags=["merchant-risk"])
@router.post("/api/merchant-risk/stream")
async def merchant_risk_stream(request: MerchantRiskRequest):
    if not (os.getenv("TAVILY_API_KEY") or "").strip():
        raise HTTPException(status_code=503, detail="TAVILY_API_KEY is not configured")
    return StreamingResponse(stream_merchant_risk(request), media_type="text/event-stream", headers=SSE_HEADERS)
