"""Identity-first merchant public-web risk context workflow."""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncGenerator
from typing import Any

from backend.core.db import save_run
from backend.core.research import orchestrate_lanes
from backend.core.research.client import normalize_sources
from backend.core.research.orchestrator import ResearchStream, sse

from .prompts import LANE_META, identity_lane, risk_lanes
from .schemas import MerchantEvidence, MerchantRiskRequest, WebRiskContext

WORKFLOW = "merchant_risk"
RUN_KIND = "merchant_risk"


def _final_context(request: MerchantRiskRequest, results: dict[str, Any], errors: dict[str, str], sources: list[dict[str, Any]]) -> dict[str, Any]:
    identity = results.get("identity")
    confidence = (identity or {}).get("confidence", "unresolved")
    indicators: list[dict[str, Any]] = []
    for lane_id in ("restricted_products", "reputation", "legal_regulatory"):
        indicators.extend((results.get(lane_id) or {}).get("indicators") or [])
    gaps = [f"{lane}: {message}" for lane, message in errors.items()]
    for lane_id in ("restricted_products", "reputation", "legal_regulatory"):
        gaps.extend((results.get(lane_id) or {}).get("evidence_gaps") or [])
    if confidence in ("low", "unresolved"):
        gaps.append("Merchant identity is not confidently resolved; findings may be incomplete or misattributed.")
    unique_sources = normalize_sources(sources)
    completed_risk_lanes = sum(lane in results for lane in ("category_fit", "restricted_products", "reputation", "legal_regulatory"))
    if confidence == "unresolved" or not unique_sources or completed_risk_lanes < 2:
        coverage = "weak"
    elif confidence == "high" and completed_risk_lanes == 4 and not errors:
        coverage = "strong"
    else:
        coverage = "partial"
    if indicators:
        context_level = "review_indicated"
    elif coverage == "weak" or errors:
        context_level = "insufficient_evidence"
    else:
        # Deliberately not called "low risk": public-web research cannot establish it.
        context_level = "no_material_indicators_found"
    result = WebRiskContext(
        merchant_name=request.merchant_name,
        category_code=request.category_code,
        resolved_identity=identity,
        identity_confidence=confidence,
        identity_ambiguities=(identity or {}).get("ambiguities") or [],
        category_fit=results.get("category_fit"),
        restricted_products=results.get("restricted_products"),
        reputation=results.get("reputation"),
        legal_regulatory=results.get("legal_regulatory"),
        web_context_level=context_level,
        evidence_coverage=coverage,
        risk_indicators=[MerchantEvidence.model_validate(item) for item in indicators],
        evidence_gaps=list(dict.fromkeys(gaps)),
        next_checks=[
            "Verify legal entity and beneficial ownership using authoritative onboarding documents.",
            "Validate category code against transaction descriptors and actual product inventory.",
            "Run applicable sanctions, licensing, and regulator database checks directly.",
        ],
        lane_errors=errors,
        sources=unique_sources,
    )
    return result.model_dump(mode="json")


async def stream_merchant_risk(request: MerchantRiskRequest, *, research_stream: ResearchStream | None = None) -> AsyncGenerator[str, None]:
    run_id = f"merchant-{uuid.uuid4().hex[:8]}"
    started = time.monotonic()
    yield sse({"type": "start", "run_id": run_id, "workflow": WORKFLOW, "lanes": [{"id": i, "label": label} for i, label in LANE_META]})
    results: dict[str, Any] = {}
    errors: dict[str, str] = {}
    sources: list[dict[str, Any]] = []

    async for event in orchestrate_lanes(
        run_id=run_id, workflow=WORKFLOW, lanes=[identity_lane(request)],
        research_stream=research_stream, max_concurrency=1, emit_start=False, emit_terminal=False,
    ):
        if event["type"] == "lane_complete":
            results["identity"] = event["data"]
        elif event["type"] == "error":
            errors["identity"] = event["message"]
        sources = normalize_sources([*sources, *(event.get("sources") or [])])
        yield sse(event)

    async for event in orchestrate_lanes(
        run_id=run_id, workflow=WORKFLOW, lanes=risk_lanes(request, results.get("identity")),
        research_stream=research_stream, max_concurrency=4, emit_start=False, emit_terminal=False,
    ):
        if event["type"] == "lane_complete":
            results[event["lane_id"]] = event["data"]
        elif event["type"] == "error":
            errors[event["lane_id"]] = event["message"]
        sources = normalize_sources([*sources, *(event.get("sources") or [])])
        yield sse(event)

    final_data = _final_context(request, results, errors, sources)
    yield sse({"type": "result", "run_id": run_id, "workflow": WORKFLOW, "data": final_data, "sources": sources})
    elapsed = round(time.monotonic() - started, 2)
    yield sse({"type": "complete", "run_id": run_id, "workflow": WORKFLOW, "elapsed_s": elapsed})
    save_run(
        run_id, kind=RUN_KIND, query=request.merchant_name, elapsed_s=elapsed,
        counts={"lanes_complete": len(results), "lanes_error": len(errors)},
        payload={"request": request.model_dump(mode="json"), "result": final_data, "sources": sources},
    )
