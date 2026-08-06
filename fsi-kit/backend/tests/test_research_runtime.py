import asyncio
import json
import unittest

import httpx
from pydantic import BaseModel

from backend.core.research.client import (
    TavilyResearchClient,
    normalize_sources,
    parse_sse_json,
    to_tavily_output_schema,
)
from backend.core.research.orchestrator import ResearchLane, orchestrate_lanes


class LaneResult(BaseModel):
    summary: str
    items: list[str]


async def chunks(*values):
    for value in values:
        await asyncio.sleep(0)
        yield value


class SSEParserTests(unittest.IsolatedAsyncioTestCase):
    async def test_split_crlf_multiline_malformed_and_done(self):
        stream = chunks(
            b": keepalive\r\nda",
            b'ta: {"one": 1}\r\n\r\ndata: {"two":\r\n',
            b"data: 2}\r\n\r\ndata: not-json\r\n\r\n",
            b'data: [DONE]\r\n\r\ndata: {"ignored": true}\r\n\r\n',
        )
        events = [event async for event in parse_sse_json(stream)]
        self.assertEqual(events, [{"one": 1}, {"two": 2}])

    async def test_client_posts_server_key_mini_and_schema(self):
        seen = {}

        async def handler(request: httpx.Request) -> httpx.Response:
            seen["authorization"] = request.headers["Authorization"]
            seen["payload"] = json.loads(request.content)
            return httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=b'data: {"choices": []}\n\nevent: done\n\n',
            )

        client = TavilyResearchClient(
            api_key="server-secret", transport=httpx.MockTransport(handler)
        )
        output = [
            item
            async for item in client.stream(
                "query",
                {
                    "type": "object",
                    "title": "Ignored",
                    "properties": {"answer": {"type": "string"}},
                    "required": ["answer"],
                },
            )
        ]
        self.assertEqual(len(output), 1)
        self.assertEqual(seen["authorization"], "Bearer server-secret")
        self.assertEqual(seen["payload"]["model"], "mini")
        self.assertTrue(seen["payload"]["stream"])
        self.assertEqual(
            seen["payload"]["output_schema"],
            {
                "properties": {"answer": {"type": "string", "description": "answer"}},
                "required": ["answer"],
            },
        )

    def test_pydantic_schema_is_inlined_and_reduced_to_tavily_subset(self):
        class Nested(BaseModel):
            label: str

        class Output(BaseModel):
            nested: list[Nested]
            optional_note: str | None = None

        schema = to_tavily_output_schema(Output.model_json_schema())
        self.assertEqual(set(schema), {"properties", "required"})
        serialized = json.dumps(schema)
        self.assertNotIn("$defs", serialized)
        self.assertNotIn("$ref", serialized)
        self.assertNotIn("anyOf", serialized)
        self.assertEqual(
            schema["properties"]["nested"]["items"]["properties"]["label"]["type"],
            "string",
        )
        self.assertEqual(schema["properties"]["optional_note"]["type"], "string")
        self.assertEqual(schema["required"], ["nested"])
        self.assertTrue(schema["properties"]["nested"]["description"])
        self.assertTrue(
            schema["properties"]["nested"]["items"]["properties"]["label"][
                "description"
            ]
        )

    def test_schema_with_only_default_fields_gets_nonempty_required(self):
        class Output(BaseModel):
            items: list[str] = []
            notes: list[str] = []

        schema = to_tavily_output_schema(Output.model_json_schema())
        self.assertEqual(schema["required"], ["items", "notes"])

    async def test_client_raises_on_sse_error_payload(self):
        async def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                headers={"content-type": "text/event-stream"},
                content=b'event: error\ndata: {"error":"bad schema"}\n\n',
            )

        client = TavilyResearchClient(
            api_key="server-secret", transport=httpx.MockTransport(handler)
        )
        with self.assertRaisesRegex(RuntimeError, "bad schema"):
            _ = [item async for item in client.stream("query", {"properties": {}})]

    def test_source_normalization_deduplicates_fragments_and_trailing_slashes(self):
        sources = normalize_sources(
            [
                {"title": "first", "url": "HTTPS://Example.com/report/#part"},
                {"title": "duplicate", "url": "https://example.com/report"},
                {"link": "https://other.test/a", "date": "2026-01-01"},
            ]
        )
        self.assertEqual(len(sources), 2)
        self.assertEqual(sources[0]["title"], "first")
        self.assertEqual(sources[1]["published_date"], "2026-01-01")


class OrchestratorTests(unittest.IsolatedAsyncioTestCase):
    async def test_partial_failure_preserves_success_and_sources(self):
        async def fake_stream(query, schema):
            if query == "bad":
                raise RuntimeError("mock upstream failure")
            yield {
                "choices": [
                    {
                        "delta": {
                            "tool_calls": {
                                "type": "tool_call",
                                "tool_call": [{"name": "WebSearch", "queries": ["q1"]}],
                            }
                        }
                    }
                ]
            }
            yield {
                "choices": [
                    {
                        "delta": {
                            "tool_calls": {
                                "type": "tool_response",
                                "tool_response": [
                                    {
                                        "sources": [
                                            {
                                                "title": "A",
                                                "url": "https://example.test/a",
                                            }
                                        ]
                                    }
                                ],
                            }
                        }
                    }
                ]
            }
            yield {
                "choices": [
                    {"delta": {"content": {"summary": "hel", "items": '["one"'}}}
                ]
            }
            yield {"choices": [{"delta": {"content": {"summary": "lo", "items": "]"}}}]}

        lanes = [
            ResearchLane("good", "Good", "good", LaneResult),
            ResearchLane("bad", "Bad", "bad", LaneResult),
        ]
        events = [
            event
            async for event in orchestrate_lanes(
                run_id="run-1",
                workflow="test",
                lanes=lanes,
                research_stream=fake_stream,
                max_concurrency=1,
            )
        ]
        types = [event["type"] for event in events]
        self.assertEqual(types[0], "start")
        self.assertIn("progress", types)
        self.assertIn("sources_found", types)
        self.assertIn("lane_complete", types)
        self.assertIn("error", types)
        self.assertEqual(types[-2:], ["result", "complete"])
        result = events[-2]
        self.assertEqual(
            result["data"]["lanes"]["good"], {"summary": "hello", "items": ["one"]}
        )
        self.assertIn("bad", result["data"]["lane_errors"])
        self.assertEqual(result["sources"][0]["url"], "https://example.test/a")


if __name__ == "__main__":
    unittest.main()
