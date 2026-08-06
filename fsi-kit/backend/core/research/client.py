"""Hardened asynchronous adapter for Tavily's streaming Research API."""

from __future__ import annotations

import codecs
import json
import logging
import os
import re
from collections.abc import AsyncGenerator, AsyncIterable
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx

logger = logging.getLogger(__name__)
RESEARCH_URL = "https://api.tavily.com/research"
DEFAULT_TIMEOUT = httpx.Timeout(connect=10.0, read=180.0, write=30.0, pool=10.0)


async def parse_sse_json(chunks: AsyncIterable[bytes | str]) -> AsyncGenerator[dict[str, Any], None]:
    """Parse arbitrary SSE chunks into JSON objects."""
    decoder = codecs.getincrementaldecoder("utf-8")("replace")
    buffer = ""

    def decode_record(record: str) -> tuple[dict[str, Any] | None, bool]:
        data_lines: list[str] = []
        event_name = ""
        for raw_line in record.split("\n"):
            line = raw_line.rstrip("\r")
            if not line or line.startswith(":"):
                continue
            field, sep, value = line.partition(":")
            if sep and value.startswith(" "):
                value = value[1:]
            if field == "data":
                data_lines.append(value)
            elif field == "event":
                event_name = value
        if event_name == "done" and not data_lines:
            return None, True
        if not data_lines:
            return None, False
        raw_data = "\n".join(data_lines).strip()
        if raw_data == "[DONE]":
            return None, True
        try:
            value = json.loads(raw_data)
        except json.JSONDecodeError:
            logger.warning("Ignoring malformed Tavily SSE record: %r", raw_data[:160])
            return None, event_name == "done"
        return (value if isinstance(value, dict) else None), event_name == "done"

    async for chunk in chunks:
        buffer += chunk if isinstance(chunk, str) else decoder.decode(chunk)
        while True:
            separator = re.search(r"\r?\n\r?\n|\r\r", buffer)
            if separator is None:
                break
            record = buffer[: separator.start()].replace("\r\n", "\n").replace("\r", "\n")
            buffer = buffer[separator.end() :]
            value, done = decode_record(record)
            if value is not None:
                yield value
            if done:
                return

    buffer += decoder.decode(b"", final=True)
    if buffer.strip():
        value, _ = decode_record(buffer.replace("\r\n", "\n").replace("\r", "\n"))
        if value is not None:
            yield value


def _canonical_url(url: str) -> str:
    try:
        parts = urlsplit(url.strip())
    except ValueError:
        return url.strip()
    if not parts.scheme or not parts.netloc:
        return url.strip()
    path = parts.path.rstrip("/") or "/"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, parts.query, ""))


def normalize_sources(sources: Any) -> list[dict[str, Any]]:
    """Normalize and de-duplicate Tavily source objects by canonical URL."""
    if not isinstance(sources, list):
        return []
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()
    for source in sources:
        if isinstance(source, str):
            source = {"url": source}
        if not isinstance(source, dict):
            continue
        url = source.get("url") or source.get("link")
        if not isinstance(url, str) or not url.strip():
            continue
        key = _canonical_url(url)
        if key in seen:
            continue
        seen.add(key)
        item: dict[str, Any] = {
            "title": str(source.get("title") or url),
            "url": url.strip(),
        }
        for source_key in ("favicon", "published_date", "citation"):
            if source.get(source_key):
                item[source_key] = source[source_key]
        if source.get("date") and "published_date" not in item:
            item["published_date"] = source["date"]
        normalized.append(item)
    return normalized


class TavilyResearchClient:
    """Server-side client for structured, streaming Tavily mini research."""

    def __init__(
        self,
        api_key: str | None = None,
        *,
        timeout: httpx.Timeout | float = DEFAULT_TIMEOUT,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else os.getenv("TAVILY_API_KEY")
        self.timeout = timeout
        self.transport = transport

    async def stream(self, query: str, output_schema: dict[str, Any]) -> AsyncGenerator[dict[str, Any], None]:
        if not self.api_key:
            raise RuntimeError("TAVILY_API_KEY is not configured on the server")
        auth = self.api_key.strip()
        if not auth.lower().startswith("bearer "):
            auth = f"Bearer {auth}"
        payload = {
            "input": query,
            "model": "mini",
            "output_schema": output_schema,
            "stream": True,
            "citation_format": "numbered",
        }
        headers = {
            "Authorization": auth,
            "Accept": "text/event-stream",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout, transport=self.transport) as client:
            async with client.stream("POST", RESEARCH_URL, headers=headers, json=payload) as response:
                if response.status_code >= 400:
                    body = (await response.aread()).decode("utf-8", "replace")[:500]
                    raise RuntimeError(f"Tavily Research returned HTTP {response.status_code}: {body}")
                async for event in parse_sse_json(response.aiter_bytes()):
                    if event.get("object") == "error" or event.get("type") == "error":
                        message = event.get("error") or event.get("message") or "unknown upstream error"
                        raise RuntimeError(f"Tavily Research error: {message}")
                    yield event
