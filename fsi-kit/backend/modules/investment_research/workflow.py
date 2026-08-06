"""Streaming investment-research workflow."""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from backend.core.db import save_run
from backend.core.research import orchestrate_lanes
from backend.core.research.client import normalize_sources
from backend.core.research.orchestrator import ResearchStream

from .prompts import build_lanes
from .schemas import InvestmentResearchRequest, MeetingBrief

WORKFLOW = "investment_research"
RUN_KIND = "investment_research"


def _meeting_brief(request: InvestmentResearchRequest, results: dict[str, Any], errors: dict[str, str], sources: list[dict[str, Any]]) -> dict[str, Any]:
    completed = len(results)
    summary_parts: list[str] = []
    economic_summary = (results.get("economic_data") or {}).get("trend_summary")
    if economic_summary:
        summary_parts.append(str(economic_summary))
    for lane_id, field in (("official_policy", "developments"), ("market_expectations", "consensus")):
        items = (results.get(lane_id) or {}).get(field) or []
        if items and isinstance(items[0], dict):
            detail = items[0].get("detail") or items[0].get("claim")
            if detail:
                summary_parts.append(str(detail))
    summary = " ".join(summary_parts[:3])
    if not summary:
        summary = f"Research completed across {completed} of 5 workstreams for {request.topic}."
    if errors:
        summary += " Review the lane errors and evidence gaps before relying on the brief."
    gaps = [f"{lane}: {message}" for lane, message in errors.items()]
    if not sources:
        gaps.append("No public-web sources were retained; evidence coverage is insufficient.")
    brief = MeetingBrief(
        topic=request.topic,
        meeting_objective=request.meeting_objective,
        audience=request.audience,
        horizon=request.horizon,
        executive_summary=summary,
        official_policy=results.get("official_policy"),
        economic_data=results.get("economic_data"),
        market_expectations=results.get("market_expectations"),
        portfolio_implications=results.get("portfolio_implications"),
        scenarios=results.get("scenarios"),
        discussion_questions=[
            f"Which evidence would most change the base case for {request.topic}?",
            "Which assumptions differ most across the completed research lanes?",
            "What source or data update should the team monitor next?",
        ],
        evidence_gaps=gaps,
        lane_errors=errors,
        sources=normalize_sources(sources),
    )
    return brief.model_dump(mode="json")


async def stream_investment_research(
    request: InvestmentResearchRequest,
    *,
    research_stream: ResearchStream | None = None,
) -> AsyncGenerator[str, None]:
    run_id = f"investment-{uuid.uuid4().hex[:8]}"
    started = time.monotonic()
    final_data: dict[str, Any] | None = None
    final_sources: list[dict[str, Any]] = []
    completed = False
    async for event in orchestrate_lanes(
        run_id=run_id,
        workflow=WORKFLOW,
        lanes=build_lanes(request),
        research_stream=research_stream,
        max_concurrency=5,
        finalize=lambda results, errors, sources: _meeting_brief(request, results, errors, sources),
    ):
        if event["type"] == "result":
            final_data = event["data"]
            final_sources = event.get("sources") or []
        elif event["type"] == "complete":
            completed = True
        from backend.core.research.orchestrator import sse
        yield sse(event)
    if completed and final_data is not None:
        save_run(
            run_id, kind=RUN_KIND, query=request.topic,
            elapsed_s=round(time.monotonic() - started, 2),
            counts={"lanes_complete": 5 - len(final_data.get("lane_errors", {})), "lanes_error": len(final_data.get("lane_errors", {}))},
            payload={"request": request.model_dump(mode="json"), "result": final_data, "sources": final_sources},
        )
