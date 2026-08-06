import json
import unittest
from unittest import mock

from backend.modules.merchant_risk.identity import identity_system_prompt, identity_task
from backend.modules.merchant_risk.prompts import risk_lanes
from backend.modules.merchant_risk.schemas import MerchantRiskRequest
from backend.modules.merchant_risk.workflow import stream_merchant_risk


async def resolved_identity_stream(request, audit):
    yield {"type": "stage", "stage": "Planning search strategy", "detail": ""}
    yield {"type": "stage", "stage": "Searching the web", "detail": '"Fashion Nova" official website'}
    yield {"type": "log", "entry": {
        "type": "tool_result",
        "hits": [
            {"title": "Fashion Nova | Official Site", "url": "https://www.fashionnova.com/"},
            {"title": "FTC Takes Action Against Fashion Nova", "url": "https://www.ftc.gov/news-events/fashion-nova"},
        ],
    }}
    yield {"type": "stage", "stage": "Reading articles", "detail": "https://www.fashionnova.com/"}
    yield {"type": "result", "data": {
        "canonical_name": "Fashion Nova",
        "canonical_domain": "fashionnova.com",
        "country": "United States",
        "business_description": "Online fashion retailer.",
        "confidence": "high",
        "match_basis": ["Official site and FTC source agree on the merchant identity."],
        "ambiguities": [],
        "alternative_candidates": [],
    }}


class MerchantIdentityTests(unittest.IsolatedAsyncioTestCase):
    def test_identity_agent_prompt_requires_search_then_extract(self):
        request = MerchantRiskRequest(
            merchant_name="Fashion Nova",
            category_code="5651 — Family Clothing Stores",
            domain="fashionnova.com",
            country="United States",
        )
        prompt = identity_system_prompt()
        task = identity_task(request)
        self.assertIn("exactly one Tavily Search", prompt)
        self.assertIn("at most one Tavily Extract", prompt)
        self.assertIn("Stop after identity resolution", task)
        self.assertIn("fashionnova.com", task)

    async def test_workflow_hands_agent_identity_to_four_research_lanes(self):
        request = MerchantRiskRequest(
            merchant_name="Fashion Nova",
            category_code="5651 — Family Clothing Stores",
            domain="fashionnova.com",
            country="United States",
        )
        research_queries = []

        async def fake_research(query, schema):
            research_queries.append(query)
            if "Compare products" in query:
                content = {"observed_offerings": [], "category_fit": "consistent", "explanation": "Matched"}
            elif "Look only for evidence" in query:
                content = {"indicators": [], "products_reviewed": [], "evidence_gaps": []}
            elif "Find credible patterns" in query:
                content = {"indicators": [], "themes": [], "evidence_gaps": []}
            else:
                content = {"indicators": [], "jurisdictions_checked": ["United States"], "evidence_gaps": []}
            yield {"content": content}

        with mock.patch("backend.modules.merchant_risk.workflow.save_run"), mock.patch("backend.modules.merchant_risk.workflow.AuditTrail.flush", return_value="/tmp/identity.jsonl"):
            records = []
            async for raw in stream_merchant_risk(request, research_stream=fake_research, identity_stream=resolved_identity_stream):
                records.append(json.loads(raw.removeprefix("data: ").strip()))

        identity_complete = next(index for index, item in enumerate(records) if item["type"] == "lane_complete" and item["lane_id"] == "identity")
        first_risk_progress = next(index for index, item in enumerate(records) if item["type"] == "progress" and item["lane_id"] != "identity")
        self.assertLess(identity_complete, first_risk_progress)
        self.assertEqual(len(research_queries), 4)
        self.assertTrue(all('"canonical_domain": "fashionnova.com"' in query for query in research_queries))
        self.assertEqual(records[-1]["type"], "complete")
        final = next(item for item in records if item["type"] == "result")
        self.assertEqual(final["data"]["lane_skips"], {})
        identity_sources = next(item for item in records if item["type"] == "sources_found" and item["lane_id"] == "identity")
        self.assertEqual(len(identity_sources["sources"]), 2)

    async def test_unresolved_identity_skips_research_lanes(self):
        async def unresolved_stream(request, audit):
            yield {"type": "stage", "stage": "Searching the web", "detail": "ambiguous merchant"}
            yield {"type": "result", "data": {
                "canonical_name": None,
                "canonical_domain": None,
                "country": None,
                "business_description": None,
                "confidence": "unresolved",
                "match_basis": [],
                "ambiguities": ["Multiple same-name businesses."],
                "alternative_candidates": [],
            }}

        request = MerchantRiskRequest(merchant_name="Ambiguous Name", category_code="5999")
        research_called = False
        async def fake_research(query, schema):
            nonlocal research_called
            research_called = True
            if False:
                yield {}

        with mock.patch("backend.modules.merchant_risk.workflow.save_run"), mock.patch("backend.modules.merchant_risk.workflow.AuditTrail.flush", return_value="/tmp/identity.jsonl"):
            records = []
            async for raw in stream_merchant_risk(request, research_stream=fake_research, identity_stream=unresolved_stream):
                records.append(json.loads(raw.removeprefix("data: ").strip()))

        self.assertFalse(research_called)
        self.assertEqual(sum(item["type"] == "lane_skipped" for item in records), 4)
        final = next(item for item in records if item["type"] == "result")
        self.assertEqual(final["data"]["web_context_level"], "insufficient_evidence")
        self.assertEqual(len(final["data"]["lane_skips"]), 4)


if __name__ == "__main__":
    unittest.main()
