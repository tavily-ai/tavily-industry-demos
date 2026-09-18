from typing import TypedDict, NotRequired, Required, Dict, List, Any
from collections import defaultdict
from datetime import datetime

class InputState(TypedDict, total=False):
    destination: Required[str]
    travel_segment: NotRequired[str]
    research_priorities: NotRequired[str]
    job_id: NotRequired[str]

class ResearchState(InputState):
    site_scrape: Dict[str, Any]
    messages: List[Any]
    destination_data: Dict[str, Any]
    trends_data: Dict[str, Any]
    pricing_data: Dict[str, Any]
    disruptions_data: Dict[str, Any]
    curated_destination_data: Dict[str, Any]
    curated_trends_data: Dict[str, Any]
    curated_pricing_data: Dict[str, Any]
    curated_disruptions_data: Dict[str, Any]
    destination_briefing: str
    trends_briefing: str
    pricing_briefing: str
    disruptions_briefing: str
    references: List[str]
    briefings: Dict[str, Any]
    report: str

job_status = defaultdict[Any, dict[str, Any]](lambda: {
    "status": "pending",
    "result": None,
    "error": None,
    "debug_info": [],
    "destination": None,
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
