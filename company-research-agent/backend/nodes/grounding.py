import logging

from langchain_core.messages import AIMessage

from ..classes import InputState, ResearchState
from ..classes.state import job_status

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
        
        if job_id:
            try:
                if job_id in job_status:
                    job_status[job_id]["events"].append(event)
            except Exception as e:
                logger.error(f"Error appending research_init event: {e}")
        
        yield event

        # Fast mode relies on targeted search and skips the potentially large
        # company-site crawl. The submitted URL is retained in the job state.
        site_scrape = {}
        # Add context about what information we have
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
        """Run grounding - note: for now returns directly, events can be captured if needed"""
        # For compatibility, we call the generator but don't yield
        # The calling code can be updated later to consume events
        result = None
        async for event in self.initial_search(state):
            # The last yield should be the research_state (a dict with state fields)
            # Earlier yields are event dicts with "type" field
            if isinstance(event, dict) and "type" not in event:
                result = event
        return result if result else {}
