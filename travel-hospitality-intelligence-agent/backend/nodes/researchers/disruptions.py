from typing import Any

from langchain_core.messages import AIMessage

from ...classes import ResearchState
from ...prompts import DISRUPTIONS_ANALYZER_QUERY_PROMPT
from .base import BaseResearcher


class DisruptionsScanner(BaseResearcher):
    def __init__(self, tavily_api_key: str | None = None) -> None:
        super().__init__(tavily_api_key)
        self.analyst_type = "disruptions_analyzer"

    async def analyze(self, state: ResearchState):
        destination = state.get('destination', 'Unknown destination')

        queries = []
        async for event in self.generate_queries(state, DISRUPTIONS_ANALYZER_QUERY_PROMPT):
            yield event
            if event.get("type") == "queries_complete":
                queries = event.get("queries", [])

        subqueries_msg = "🔍 Subqueries for disruptions and sentiment:\n" + "\n".join([f"• {query}" for query in queries])
        state.setdefault('messages', []).append(AIMessage(content=subqueries_msg))

        disruptions_data = dict[str, Any](state.get('site_scrape', {}))

        documents = {}
        async for event in self.search_documents(state, queries):
            yield event
            if event.get("type") == "search_complete":
                documents = event.get("merged_docs", {})

        disruptions_data.update(documents)

        completion_msg = f"⚠️ Disruptions lane found {len(disruptions_data)} documents for {destination}"
        state.setdefault('messages', []).append(AIMessage(content=completion_msg))
        state['disruptions_data'] = disruptions_data

        yield {"type": "analysis_complete", "data_type": "disruptions_data", "count": len(disruptions_data)}
        yield {'message': [completion_msg], 'disruptions_data': disruptions_data}

    async def run(self, state: ResearchState):
        result = None
        async for event in self.analyze(state):
            yield event
            if "message" in event or "disruptions_data" in event:
                result = event
        yield result or {}
