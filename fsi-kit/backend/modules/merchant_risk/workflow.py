"""Identity-first merchant public-web risk context workflow."""

from __future__ import annotations

import time
import uuid
from collections.abc import AsyncGenerator, AsyncIterator, Callable
from typing import Any

from backend.core.audit import AuditTrail
from backend.core.db import save_run
from backend.core.research import orchestrate_lanes
from backend.core.research.client import normalize_sources
from backend.core.research.orchestrator import ResearchStream, sse
from backend.core.streaming.agent_stream import stream_agent_run

from .identity import build_identity_agent, identity_task
from .prompts import LANE_META, risk_lanes
from .schemas import MerchantEvidence, MerchantIdentity, MerchantRiskRequest, WebRiskContext

WORKFLOW = "merchant_risk"
RUN_KIND = "merchant_risk"


def _normalize_confidence(value: Any) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "high_confidence": "high", "confident": "high",
        "medium_confidence": "medium", "moderate": "medium", "moderate_confidence": "medium",
        "low_confidence": "low", "uncertain": "low",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in {"low", "medium", "high"} else "unresolved"


def _normalize_category_fit(value: Any) -> str:
    normalized = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "matches": "consistent", "match": "consistent",
        "partially_consistent": "mixed", "partial": "mixed",
        "does_not_match": "inconsistent", "mismatch": "inconsistent",
        "unknown": "insufficient_evidence", "unclear": "insufficient_evidence",
    }
    normalized = aliases.get(normalized, normalized)
    allowed = {"consistent", "mixed", "inconsistent", "insufficient_evidence"}
    return normalized if normalized in allowed else "insufficient_evidence"


def _final_context(request: MerchantRiskRequest, results: dict[str, Any], errors: dict[str, str], skips: dict[str, str], sources: list[dict[str, Any]]) -> dict[str, Any]:
    raw_identity = results.get("identity")
    confidence = _normalize_confidence((raw_identity or {}).get("confidence"))
    identity = dict(raw_identity) if raw_identity else None
    if identity is not None:
        identity["confidence"] = confidence
    category_fit = dict(results["category_fit"]) if results.get("category_fit") else None
    if category_fit is not None:
        category_fit["category_fit"] = _normalize_category_fit(category_fit.get("category_fit"))
    indicators: list[dict[str, Any]] = []
    for lane_id in ("restricted_products", "reputation", "legal_regulatory"):
        indicators.extend((results.get(lane_id) or {}).get("indicators") or [])
    gaps = [f"{lane}: {message}" for lane, message in errors.items()]
    gaps.extend(f"{lane}: {message}" for lane, message in skips.items())
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
        category_fit=category_fit,
        restricted_products=results.get("restricted_products"),
        reputation=results.get("reputation"),
        legal_regulatory=results.get("legal_regulatory"),
        web_context_level=context_level,
        evidence_coverage=coverage,
        risk_indicators=[MerchantEvidence.model_validate(item) for item in indicators],
        evidence_gaps=list(dict.fromkeys(gaps)),
        next_checks=[],
        lane_errors=errors,
        lane_skips=skips,
        sources=unique_sources,
    )
    return result.model_dump(mode="json")


IdentityStream = Callable[[MerchantRiskRequest, AuditTrail], AsyncIterator[dict[str, Any]]]


async def _default_identity_stream(request: MerchantRiskRequest, audit: AuditTrail) -> AsyncIterator[dict[str, Any]]:
    async for event in stream_agent_run(
        agent=build_identity_agent(),
        task=identity_task(request),
        audit=audit,
        client_id="identity",
    ):
        yield event


async def stream_merchant_risk(
    request: MerchantRiskRequest,
    *,
    research_stream: ResearchStream | None = None,
    identity_stream: IdentityStream | None = None,
) -> AsyncGenerator[str, None]:
    run_id = f"merchant-{uuid.uuid4().hex[:8]}"
    started = time.monotonic()
    yield sse({"type": "start", "run_id": run_id, "workflow": WORKFLOW, "lanes": [{"id": i, "label": label} for i, label in LANE_META]})
    results: dict[str, Any] = {}
    errors: dict[str, str] = {}
    skips: dict[str, str] = {}
    sources: list[dict[str, Any]] = []
    audit = AuditTrail(run_id, kind="merchant_identity")
    audit.record("identity_start", merchant_name=request.merchant_name, submitted_domain=request.domain)
    run_identity = identity_stream or _default_identity_stream
    queries: list[str] = []

    # Step 1 reuses the existing LangChain agent runtime with Tavily Search + Extract.
    async for agent_event in run_identity(request, audit):
        event_type = agent_event.get("type")
        if event_type == "stage":
            stage = str(agent_event.get("stage") or "Resolving merchant identity")
            detail = str(agent_event.get("detail") or "")
            stage_lower = stage.lower()
            if "search" in stage_lower:
                phase = "searching"
                if detail and detail not in queries:
                    queries.append(detail)
            elif "reading" in stage_lower or "extract" in stage_lower:
                phase = "extracting"
            elif "found" in stage_lower:
                phase = "reviewing_sources"
            else:
                phase = "planning"
            yield sse({
                "type": "progress", "run_id": run_id, "workflow": WORKFLOW,
                "lane_id": "identity", "phase": phase, "message": stage,
                **({"queries": queries} if queries else {}),
            })
        elif event_type == "log":
            entry = agent_event.get("entry") or {}
            hits = entry.get("hits") if isinstance(entry, dict) else None
            found = normalize_sources(hits)
            if found:
                before = {item.get("url") for item in sources}
                sources = normalize_sources([*sources, *found])
                new_sources = [item for item in sources if item.get("url") not in before]
                if new_sources:
                    yield sse({
                        "type": "sources_found", "run_id": run_id, "workflow": WORKFLOW,
                        "lane_id": "identity", "sources": new_sources,
                    })
        elif event_type == "result":
            identity = MerchantIdentity.model_validate(agent_event.get("data") or {}).model_dump(mode="json")
            identity["confidence"] = _normalize_confidence(identity.get("confidence"))
            results["identity"] = identity
            resolved_label = identity.get("canonical_name") or request.merchant_name
            resolved_domain = identity.get("canonical_domain") or "domain unresolved"
            yield sse({
                "type": "lane_complete", "run_id": run_id, "workflow": WORKFLOW,
                "lane_id": "identity", "data": identity, "sources": sources,
                "message": f"Resolved {resolved_label} · {resolved_domain}; handed to four Research lanes",
            })
        elif event_type == "error":
            message = str(agent_event.get("message") or "Identity agent failed")
            errors["identity"] = message
            yield sse({
                "type": "error", "run_id": run_id, "workflow": WORKFLOW,
                "lane_id": "identity", "message": message,
            })

    identity = results.get("identity")
    identity_unresolved = not identity or not identity.get("canonical_domain") or identity.get("confidence") == "unresolved"
    if identity_unresolved:
        block_reason = "Blocked because the identity agent did not establish a merchant domain"
        for lane_id, _ in LANE_META[1:]:
            skips[lane_id] = block_reason
            yield sse({
                "type": "lane_skipped", "run_id": run_id, "workflow": WORKFLOW,
                "lane_id": lane_id, "message": block_reason,
            })
    else:
        # Step 2 receives the completed identity object and fans out all lanes together.
        async for event in orchestrate_lanes(
            run_id=run_id, workflow=WORKFLOW, lanes=risk_lanes(request, identity),
            research_stream=research_stream, max_concurrency=4, emit_start=False, emit_terminal=False,
        ):
            if event["type"] == "lane_complete":
                results[event["lane_id"]] = event["data"]
            elif event["type"] == "error":
                errors[event["lane_id"]] = event["message"]
            sources = normalize_sources([*sources, *(event.get("sources") or [])])
            yield sse(event)

    final_data = _final_context(request, results, errors, skips, sources)
    yield sse({"type": "result", "run_id": run_id, "workflow": WORKFLOW, "data": final_data, "sources": sources})
    elapsed = round(time.monotonic() - started, 2)
    audit_path = audit.flush()
    save_run(
        run_id, kind=RUN_KIND, query=request.merchant_name, elapsed_s=elapsed,
        counts={"lanes_complete": len(results), "lanes_error": len(errors), "lanes_skipped": len(skips)},
        payload={
            "request": request.model_dump(mode="json"), "result": final_data,
            "sources": sources, "identity_audit_log": str(audit_path),
        },
    )
    yield sse({"type": "complete", "run_id": run_id, "workflow": WORKFLOW, "elapsed_s": elapsed})
