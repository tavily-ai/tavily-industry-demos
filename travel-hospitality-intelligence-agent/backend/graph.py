import logging
import os
from typing import Any, AsyncIterator, Dict

from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph

from .classes.state import InputState
from .nodes import GroundingNode
from .nodes.briefing import Briefing
from .nodes.collector import Collector
from .nodes.curator import Curator
from .nodes.editor import Editor
from .nodes.enricher import Enricher
from .nodes.researchers import (
    DestinationAnalyzer,
    DisruptionsScanner,
    PricingAnalyzer,
    TrendsAnalyzer,
)

logger = logging.getLogger(__name__)

class Graph:
    def __init__(self, destination=None, travel_segment=None, research_priorities=None, job_id=None):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY")
        self.input_state = InputState(
            destination=destination,
            travel_segment=travel_segment,
            research_priorities=research_priorities,
            job_id=job_id,
            messages=[
                SystemMessage(content="Expert travel researcher starting investigation")
            ]
        )

        self._init_nodes()
        self._build_workflow()

    def _init_nodes(self):
        self.ground = GroundingNode()
        self.destination_analyst = DestinationAnalyzer(self.tavily_api_key)
        self.pricing_analyst = PricingAnalyzer(self.tavily_api_key)
        self.trends_analyst = TrendsAnalyzer(self.tavily_api_key)
        self.disruptions_scanner = DisruptionsScanner(self.tavily_api_key)
        self.collector = Collector()
        self.curator = Curator()
        self.enricher = Enricher(self.tavily_api_key)
        self.briefing = Briefing()
        self.editor = Editor()

    def _build_workflow(self):
        self.workflow = StateGraph(InputState)

        self.workflow.add_node("grounding", self.ground.run)
        self.workflow.add_node("destination_analyst", self.destination_analyst.run)
        self.workflow.add_node("pricing_analyst", self.pricing_analyst.run)
        self.workflow.add_node("trends_analyst", self.trends_analyst.run)
        self.workflow.add_node("disruptions_scanner", self.disruptions_scanner.run)
        self.workflow.add_node("collector", self.collector.run)
        self.workflow.add_node("curator", self.curator.run)
        self.workflow.add_node("enricher", self.enricher.run)
        self.workflow.add_node("briefing", self.briefing.run)
        self.workflow.add_node("editor", self.editor.run)

        self.workflow.set_entry_point("grounding")
        self.workflow.set_finish_point("editor")

        research_nodes = [
            "destination_analyst",
            "pricing_analyst",
            "trends_analyst",
            "disruptions_scanner",
        ]

        for node in research_nodes:
            self.workflow.add_edge("grounding", node)
            self.workflow.add_edge(node, "collector")

        self.workflow.add_edge("collector", "curator")
        self.workflow.add_edge("curator", "enricher")
        self.workflow.add_edge("enricher", "briefing")
        self.workflow.add_edge("briefing", "editor")

    async def run(self, thread: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        compiled_graph = self.workflow.compile()

        async for state in compiled_graph.astream(
            self.input_state,
            thread
        ):
            yield state

    def compile(self):
        return self.workflow.compile()
