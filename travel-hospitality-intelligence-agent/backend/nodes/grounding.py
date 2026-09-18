import logging

from langchain_core.messages import AIMessage

from ..classes import InputState, ResearchState
from ..classes.state import emit_event

logger = logging.getLogger(__name__)

class GroundingNode:
    """Records the destination and optional travel focus before search."""

    async def initial_search(self, state: InputState):
        destination = state.get('destination', 'Unknown destination')
        job_id = state.get('job_id')
        msg = f"🎯 Initiating travel intelligence for {destination}...\n"

        event = {
            "type": "research_init",
            "destination": destination,
            "message": f"Initiating research for {destination}",
            "step": "Initializing"
        }

        emit_event(job_id, event)
        yield event

        site_scrape = {}
        if travel_segment := state.get('travel_segment'):
            msg += f"\n🧳 Travel focus: {travel_segment}"
        if research_priorities := state.get('research_priorities'):
            msg += f"\n🎯 Research priorities: {research_priorities}"

        research_state = {
            "destination": state.get('destination'),
            "travel_segment": state.get('travel_segment'),
            "research_priorities": state.get('research_priorities'),
            "job_id": state.get('job_id'),
            "messages": [AIMessage(content=msg)],
            "site_scrape": site_scrape
        }

        yield {"type": "grounding_complete", "site_pages": len(site_scrape)}
        yield research_state

    async def run(self, state: InputState) -> ResearchState:
        result = None
        async for event in self.initial_search(state):
            if isinstance(event, dict) and "type" not in event:
                result = event
        return result if result else {}
