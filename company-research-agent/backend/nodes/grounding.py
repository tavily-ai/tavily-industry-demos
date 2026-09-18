import logging

from langchain_core.messages import AIMessage

from ..classes import InputState, ResearchState
from ..classes.state import emit_event

logger = logging.getLogger(__name__)

class GroundingNode:
    """Gathers initial grounding data about the company."""

    async def initial_search(self, state: InputState):
        """Initial search and yield events"""
        company = state.get('company', 'Unknown Company')
        job_id = state.get('job_id')
        msg = f"🎯 Initiating research for {company}...\n"
        
        # Emit initialization event
        event = {
            "type": "research_init",
            "company": company,
            "message": f"Initiating research for {company}",
            "step": "Initializing"
        }
        
        emit_event(job_id, event)
        yield event

        # Research uses targeted search. The submitted URL stays on the job state.
        site_scrape = {}
        if hq := state.get('hq_location'):
            msg += f"\n📍 Company HQ: {hq}"
        if industry := state.get('industry'):
            msg += f"\n🏭 Industry: {industry}"
        
        # Initialize ResearchState with input information
        research_state = {
            # Copy input fields
            "company": state.get('company'),
            "company_url": state.get('company_url'),
            "hq_location": state.get('hq_location'),
            "industry": state.get('industry'),
            "job_id": state.get('job_id'),
            # Initialize research fields
            "messages": [AIMessage(content=msg)],
            "site_scrape": site_scrape
        }

        yield {"type": "grounding_complete", "site_pages": len(site_scrape)}
        yield research_state

    async def run(self, state: InputState) -> ResearchState:
        """Return the research state produced by initial_search."""
        result = {}
        async for event in self.initial_search(state):
            if isinstance(event, dict) and "type" not in event:
                result = event
        return result
