from typing import TypedDict, NotRequired, Required, Dict, List, Any
from collections import defaultdict
from datetime import datetime

#Define the input state
class InputState(TypedDict, total=False):
    company: Required[str]
    company_url: NotRequired[str]
    hq_location: NotRequired[str]
    industry: NotRequired[str]
    job_id: NotRequired[str]

class ResearchState(InputState):
    site_scrape: Dict[str, Any]
    messages: List[Any]
    financial_data: Dict[str, Any]
    news_data: Dict[str, Any]
    industry_data: Dict[str, Any]
    company_data: Dict[str, Any]
    curated_financial_data: Dict[str, Any]
    curated_news_data: Dict[str, Any]
    curated_industry_data: Dict[str, Any]
    curated_company_data: Dict[str, Any]
    financial_briefing: str
    news_briefing: str
    industry_briefing: str
    company_briefing: str
    references: List[str]
    briefings: Dict[str, Any]
    report: str

# Global job status tracker - shared across application.py and backend nodes
job_status = defaultdict[Any, dict[str, Any]](lambda: {
    "status": "pending",
    "result": None,
    "error": None,
    "debug_info": [],
    "company": None,
    "report": None,
    "last_update": datetime.now().isoformat(),
    "events": [],
    "queue": None,
})


def emit_event(job_id: str | None, event: Dict[str, Any]) -> None:
    """Push a live event to the in-memory list and the request SSE queue."""
    if not job_id or job_id not in job_status:
        return
    job = job_status[job_id]
    events = job.get("events")
    if isinstance(events, list):
        events.append(event)
    queue = job.get("queue")
    if queue is not None:
        queue.put_nowait(event)