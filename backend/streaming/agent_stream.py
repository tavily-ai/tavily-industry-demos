"""Stream a LangChain agent run as SSE events while recording an audit trail."""

import asyncio
import json
import logging
import time
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

from backend.audit import AuditTrail

logger = logging.getLogger(__name__)

# LangChain tool names -> UI-friendly stage labels
TOOL_STAGES = {
    "tavily_search": "Searching the web",
    "tavily_extract": "Reading articles",
}

# Only these tool-input keys are surfaced to the UI/audit log
_INPUT_ALLOWLIST = {"query", "urls", "search_depth", "time_range", "include_domains", "extract_depth"}


def _filter_tool_input(raw: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in raw.items() if k in _INPUT_ALLOWLIST}


def _summarize_tool_output(output: Any) -> Dict[str, Any]:
    """Extract a compact, UI-ready summary from a Tavily tool result."""
    if isinstance(output, str):
        return {"note": output[:300]}
    if not isinstance(output, dict):
        return {}

    summary: Dict[str, Any] = {}

    results = output.get("results")
    if isinstance(results, list):
        hits = []
        for r in results[:8]:
            if not isinstance(r, dict):
                continue
            hit = {"url": r.get("url"), "title": r.get("title")}
            if r.get("raw_content"):
                hit["content_chars"] = len(r["raw_content"])
            hits.append(hit)
        summary["hits"] = hits

    failed = output.get("failed_results")
    if isinstance(failed, list) and failed:
        summary["failed"] = [f.get("url") if isinstance(f, dict) else str(f) for f in failed]

    return summary


def _content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n".join(parts)
    return ""


async def stream_agent_run(
    agent: Any,
    task: str,
    audit: AuditTrail,
    client_id: Optional[str] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Yield structured events for one agent run; the caller wraps them as SSE.

    Event shapes:
      {"type": "stage",  "stage": ..., "detail": ...}
      {"type": "log",    "entry": {...}}              audit-trail entries
      {"type": "result", "data": {...}}               final structured output
      {"type": "error",  "message": ...}
    """
    started = time.time()
    yield {"type": "stage", "client_id": client_id, "stage": "Planning search strategy"}

    final_structured: Optional[Dict[str, Any]] = None
    final_error: Optional[str] = None

    try:
        stream = agent.astream(
            {"messages": [{"role": "user", "content": task}]},
            stream_mode="updates",
        )
        async for chunk in stream:
            for node_name, node_data in chunk.items():
                if not isinstance(node_data, dict):
                    continue

                messages = node_data.get("messages") or []
                for message in messages:
                    tool_calls = getattr(message, "tool_calls", None) or []
                    for call in tool_calls:
                        name = call.get("name", "tool")
                        args = _filter_tool_input(call.get("args") or {})
                        stage = TOOL_STAGES.get(name, f"Using {name}")
                        detail = args.get("query") or ", ".join(args.get("urls", [])[:2]) or ""
                        entry = audit.record("tool_call", client_id, tool=name, args=args)
                        yield {"type": "stage", "client_id": client_id, "stage": stage, "detail": detail}
                        yield {"type": "log", "client_id": client_id, "entry": entry}

                    if node_name == "tools":
                        tool_name = getattr(message, "name", "") or ""
                        content = getattr(message, "content", None)
                        if isinstance(content, str):
                            try:
                                content = json.loads(content)
                            except (json.JSONDecodeError, TypeError):
                                pass
                        summary = _summarize_tool_output(content)
                        entry = audit.record("tool_result", client_id, tool=tool_name, **summary)
                        yield {"type": "log", "client_id": client_id, "entry": entry}
                        hits = summary.get("hits") or []
                        if hits:
                            yield {
                                "type": "stage",
                                "client_id": client_id,
                                "stage": f"Found {len(hits)} source{'s' if len(hits) != 1 else ''}",
                                "detail": hits[0].get("title") or "",
                            }

                structured = node_data.get("structured_response")
                if structured is not None:
                    final_structured = (
                        structured.model_dump() if hasattr(structured, "model_dump") else dict(structured)
                    )

    except Exception as e:
        logger.exception("agent run failed for %s", client_id)
        final_error = str(e)

    elapsed = round(time.time() - started, 2)

    if final_error:
        entry = audit.record("run_error", client_id, message=final_error, elapsed_s=elapsed)
        yield {"type": "log", "client_id": client_id, "entry": entry}
        yield {"type": "error", "client_id": client_id, "message": final_error}
        return

    if final_structured is None:
        final_structured = {"verdict": "review", "summary": "Agent finished without structured output.", "evidence": [], "risk_categories": [], "searches_performed": []}

    queries = final_structured.get("searches_performed") or []
    entry = audit.record(
        "run_complete",
        client_id,
        verdict=final_structured.get("verdict") or final_structured.get("risk_rating"),
        elapsed_s=elapsed,
        queries=queries,
    )
    yield {"type": "log", "client_id": client_id, "entry": entry}
    yield {"type": "result", "client_id": client_id, "data": final_structured, "elapsed_s": elapsed}
