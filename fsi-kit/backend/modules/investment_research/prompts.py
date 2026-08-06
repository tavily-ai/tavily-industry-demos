"""Module-owned lane definitions and prompts for investment research."""

from datetime import date

from backend.core.research import ResearchLane

from .schemas import (
    EconomicDataResearch,
    InvestmentResearchRequest,
    MarketExpectationsResearch,
    OfficialPolicyResearch,
    PortfolioImplicationsResearch,
    ScenarioResearch,
)

LANE_META = [
    ("official_policy", "Official & Policy Developments"),
    ("economic_data", "Economic & Fundamental Data"),
    ("market_expectations", "Market Expectations"),
    ("portfolio_implications", "Portfolio & Sector Implications"),
    ("scenarios", "Scenarios & Counter-thesis"),
]

_BASE = """You are preparing a source-grounded institutional investment meeting brief. Today is {today}.
Topic: {topic}
Meeting objective: {objective}
Audience: {audience}
Decision horizon: {horizon}
Research only the lane assigned below. Prefer recent primary/official sources and clearly dated high-quality reporting. Separate facts from expectations. Every evidence point must contain the URLs that support it. Do not provide personalized investment advice. State uncertainty and missing data; never invent a statistic or citation.
"""


def build_lanes(request: InvestmentResearchRequest) -> list[ResearchLane]:
    common = _BASE.format(
        today=date.today().isoformat(), topic=request.topic,
        objective=request.meeting_objective or "General briefing",
        audience=request.audience or "Investment professionals",
        horizon=request.horizon or "Not specified",
    )
    specs = [
        ("official_policy", "Official & Policy Developments", OfficialPolicyResearch,
         "Find material official announcements, policy/regulatory developments, and authoritative institutional positions relevant to the topic."),
        ("economic_data", "Economic & Fundamental Data", EconomicDataResearch,
         "Find the most decision-relevant economic, company, sector, or fundamental indicators. Preserve units, dates, and source caveats."),
        ("market_expectations", "Market Expectations", MarketExpectationsResearch,
         "Map current consensus, credible disagreements, and observable market signals. Do not present one commentator as consensus."),
        ("portfolio_implications", "Portfolio & Sector Implications", PortfolioImplicationsResearch,
         "Analyze evidence-backed transmission channels and which assets or sectors may be affected. Frame conditional implications, not recommendations."),
        ("scenarios", "Scenarios & Counter-thesis", ScenarioResearch,
         "Develop concise base/upside/downside scenarios, a serious counter-thesis, and observable signposts that would distinguish them."),
    ]
    return [ResearchLane(id=lane_id, label=label, query=f"{common}\nAssigned lane: {instruction}", output_schema=schema) for lane_id, label, schema, instruction in specs]
