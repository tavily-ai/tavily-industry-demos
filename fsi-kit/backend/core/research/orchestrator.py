"""Bounded fan-out orchestration for structured Tavily Research lanes."""

from __future__ import annotations

import asyncio
import inspect
import json
import time
from collections.abc import AsyncGenerator, AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel

from .client import TavilyResearchClient, normalize_sources

ResearchStream = Callable[[str, dict[str, Any]], AsyncIterator[dict[str, Any]]]
Finalize = Callable[
    [dict[str, Any], dict[str, str], list[dict[str, Any]]],
    dict[str, Any] | Awaitable[dict[str, Any]],
]


@dataclass(frozen=True)
class ResearchLane:
    id: str
    label: str
    query: str
    output_schema: dict[str, Any] | type[BaseModel]

    def schema(self) -> dict[str, Any]:
        if isinstance(self.output_schema, type) and issubclass(
            self.output_schema, BaseModel
        ):
            return self.output_schema.model_json_schema()
        return self.output_schema


def sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def _merge_content(accumulated: dict[str, Any], content: Any) -> None:
    if not isinstance(content, dict):
        return
    for key, value in content.items():
        if isinstance(value, str):
            previous = accumulated.get(key)
            accumulated[key] = (previous if isinstance(previous, str) else "") + value
        elif isinstance(value, list):
            previous = accumulated.get(key)
            if isinstance(previous, list):
                previous.extend(value)
            else:
                accumulated[key] = list(value)
        elif isinstance(value, dict):
            previous = accumulated.setdefault(key, {})
            if isinstance(previous, dict):
                _merge_content(previous, value)
            else:
                accumulated[key] = value
        else:
            accumulated[key] = value


def _parse_accumulated(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _parse_accumulated(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_parse_accumulated(item) for item in value]
    if isinstance(value, str):
        stripped = value.strip()
        if stripped:
            try:
                return json.loads(stripped)
            except json.JSONDecodeError:
                pass
    return value


def _event_parts(
    event: dict[str, Any],
) -> tuple[list[dict[str, Any]], Any, list[dict[str, Any]]]:
    """Return progress records, structured content delta, and sources."""
    progress: list[dict[str, Any]] = []
    sources: list[dict[str, Any]] = []
    content: Any = None
    choices = event.get("choices")
    if isinstance(choices, list) and choices:
        choice = choices[0] if isinstance(choices[0], dict) else {}
        delta = choice.get("delta") if isinstance(choice.get("delta"), dict) else {}
        content = delta.get("content")
        tool_calls = delta.get("tool_calls")
        if isinstance(tool_calls, dict):
            kind = tool_calls.get("type")
            records = (
                tool_calls.get("tool_call")
                if kind == "tool_call"
                else tool_calls.get("tool_response")
            )
            if not isinstance(records, list):
                records = []
            if kind == "tool_call":
                for record in records:
                    if not isinstance(record, dict):
                        continue
                    name = record.get("name", "Research")
                    queries = (
                        record.get("queries")
                        if isinstance(record.get("queries"), list)
                        else None
                    )
                    phases = {
                        "Planning": ("planning", "Planning research strategy"),
                        "WebSearch": ("searching", "Searching the public web"),
                        "Reflection": ("analyzing", "Analyzing retrieved evidence"),
                        "Generating": ("generating", "Generating structured findings"),
                    }
                    phase, message = phases.get(
                        str(name), ("researching", f"Running {name}")
                    )
                    progress.append(
                        {
                            "phase": phase,
                            "message": message,
                            **({"queries": queries} if queries else {}),
                        }
                    )
            elif kind == "tool_response":
                for record in records:
                    if isinstance(record, dict):
                        sources.extend(normalize_sources(record.get("sources")))
        sources.extend(normalize_sources(delta.get("sources")))
        # Some final chunks use message rather than delta.
        message = choice.get("message")
        if content is None and isinstance(message, dict):
            content = message.get("content")
            sources.extend(normalize_sources(message.get("sources")))
    if content is None:
        content = event.get("output") or event.get("content")
    sources.extend(normalize_sources(event.get("sources")))
    return progress, content, normalize_sources(sources)


async def _run_lane(
    lane: ResearchLane,
    stream: ResearchStream,
    queue: asyncio.Queue[dict[str, Any]],
    semaphore: asyncio.Semaphore,
) -> None:
    accumulated: dict[str, Any] = {}
    sources: list[dict[str, Any]] = []
    async with semaphore:
        await queue.put(
            {
                "type": "progress",
                "lane_id": lane.id,
                "phase": "starting",
                "message": f"Starting {lane.label}",
            }
        )
        try:
            async for upstream in stream(lane.query, lane.schema()):
                if not isinstance(upstream, dict):
                    continue
                progress, content, found = _event_parts(upstream)
                for item in progress:
                    await queue.put({"type": "progress", "lane_id": lane.id, **item})
                if found:
                    before = {item["url"] for item in normalize_sources(sources)}
                    sources = normalize_sources([*sources, *found])
                    new_sources = [
                        item for item in sources if item["url"] not in before
                    ]
                    if new_sources:
                        await queue.put(
                            {
                                "type": "sources_found",
                                "lane_id": lane.id,
                                "sources": new_sources,
                            }
                        )
                _merge_content(accumulated, content)
            parsed = _parse_accumulated(accumulated)
            # Validate complete lane output, but retain raw structured partials in
            # the error event if the upstream ended with an invalid shape.
            if isinstance(lane.output_schema, type) and issubclass(
                lane.output_schema, BaseModel
            ):
                parsed = lane.output_schema.model_validate(parsed).model_dump(
                    mode="json"
                )
            await queue.put(
                {
                    "type": "lane_complete",
                    "lane_id": lane.id,
                    "data": parsed,
                    "sources": sources,
                }
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            await queue.put(
                {
                    "type": "error",
                    "lane_id": lane.id,
                    "message": str(exc),
                    "partial_data": _parse_accumulated(accumulated),
                    "sources": sources,
                }
            )
        finally:
            await queue.put({"type": "_lane_done", "lane_id": lane.id})


async def orchestrate_lanes(
    *,
    run_id: str,
    workflow: str,
    lanes: list[ResearchLane],
    research_stream: ResearchStream | None = None,
    max_concurrency: int = 3,
    finalize: Finalize | None = None,
    emit_start: bool = True,
    emit_terminal: bool = True,
) -> AsyncGenerator[dict[str, Any], None]:
    """Merge bounded lane streams into JSON-ready events, retaining partial results.

    Child tasks are cancelled in ``finally`` so a disconnected SSE consumer does
    not leave Tavily requests running in the background.
    """
    started = time.monotonic()
    if research_stream is None:
        client = TavilyResearchClient()
        research_stream = client.stream
    if emit_start:
        yield {
            "type": "start",
            "run_id": run_id,
            "workflow": workflow,
            "lanes": [{"id": lane.id, "label": lane.label} for lane in lanes],
        }

    queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    semaphore = asyncio.Semaphore(max(1, max_concurrency))
    tasks = [
        asyncio.create_task(_run_lane(lane, research_stream, queue, semaphore))
        for lane in lanes
    ]
    remaining = len(tasks)
    results: dict[str, Any] = {}
    errors: dict[str, str] = {}
    all_sources: list[dict[str, Any]] = []
    try:
        while remaining:
            event = await queue.get()
            if event["type"] == "_lane_done":
                remaining -= 1
                continue
            event = {"run_id": run_id, "workflow": workflow, **event}
            if event["type"] == "lane_complete":
                results[event["lane_id"]] = event["data"]
            elif event["type"] == "error":
                errors[event["lane_id"]] = event["message"]
            all_sources = normalize_sources(
                [*all_sources, *(event.get("sources") or [])]
            )
            yield event
        await asyncio.gather(*tasks, return_exceptions=True)
        if emit_terminal:
            if finalize is None:
                final_data: dict[str, Any] = {"lanes": results, "lane_errors": errors}
            else:
                maybe_result = finalize(results, errors, all_sources)
                final_data = (
                    await maybe_result
                    if inspect.isawaitable(maybe_result)
                    else maybe_result
                )
            yield {
                "type": "result",
                "run_id": run_id,
                "workflow": workflow,
                "data": final_data,
                "sources": all_sources,
            }
            yield {
                "type": "complete",
                "run_id": run_id,
                "workflow": workflow,
                "elapsed_s": round(time.monotonic() - started, 2),
            }
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
