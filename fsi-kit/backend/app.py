"""FastAPI entry point for the Financial Services Intelligence Kit."""

import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

backend_dir = Path(__file__).parent
project_dir = backend_dir.parent
if str(project_dir) not in sys.path:
    sys.path.insert(0, str(project_dir))
load_dotenv(project_dir / ".env")

from backend.core.db import get_run, list_runs
from backend.core.llm import MODEL, PROVIDER
from backend.modules.compliance.router import router as compliance_router
from backend.modules.investment_research.router import router as investment_router
from backend.modules.merchant_risk.router import router as merchant_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

app = FastAPI(
    title="Financial Services Intelligence Kit",
    description="Evidence-first compliance, investment research, and merchant-risk workflows powered by Tavily",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(compliance_router)
app.include_router(investment_router)
app.include_router(merchant_router)


@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "fsi-kit"}


@app.get("/api/config")
async def get_config():
    return {
        "provider": PROVIDER,
        "model": MODEL,
        "research_provider": "Tavily Research",
        "research_model": "mini",
        "merchant_identity_provider": "LangChain agent with Tavily Search + Extract",
    }


@app.get("/api/modules")
async def get_modules():
    return {
        "modules": [
            {
                "id": "compliance",
                "label": "Compliance Intelligence",
                "routes": ["/compliance/watchlist", "/compliance/investigator"],
            },
            {
                "id": "investment-research",
                "label": "Investment Research",
                "routes": ["/investment-research"],
            },
            {
                "id": "merchant-risk",
                "label": "Merchant Risk",
                "routes": ["/merchant-risk"],
            },
        ]
    }


@app.get("/api/runs")
async def list_run_history(
    kind: str | None = None, limit: int = Query(default=50, ge=1, le=100)
):
    return {"runs": list_runs(kind=kind, limit=limit)}


@app.get("/api/runs/{run_id}")
async def get_run_detail(run_id: str):
    run = get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="run not found")
    return run


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
