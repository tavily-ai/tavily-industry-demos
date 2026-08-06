"""Typed inputs and structured outputs for investment research."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

from backend.core.research.models import LooseResearchModel


class InvestmentResearchRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=500)
    meeting_objective: str | None = Field(default=None, max_length=1000)
    audience: str | None = Field(default=None, max_length=300)
    horizon: str | None = Field(default=None, max_length=300)

    @field_validator("topic", "meeting_objective", "audience", "horizon")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class EvidencePoint(LooseResearchModel):
    claim: str = ""
    detail: str = ""
    source_urls: list[str] = Field(default_factory=list)
    as_of: str | int | float | None = None


class OfficialPolicyResearch(LooseResearchModel):
    developments: list[EvidencePoint] = Field(default_factory=list)
    official_positions: list[EvidencePoint] = Field(default_factory=list)
    watch_items: list[str] = Field(default_factory=list)


class EconomicDataResearch(LooseResearchModel):
    indicators: list[EvidencePoint] = Field(default_factory=list)
    trend_summary: str = ""
    data_limitations: list[str] = Field(default_factory=list)


class MarketExpectationsResearch(LooseResearchModel):
    consensus: list[EvidencePoint] = Field(default_factory=list)
    disagreements: list[EvidencePoint] = Field(default_factory=list)
    market_signals: list[EvidencePoint] = Field(default_factory=list)


class PortfolioImplicationsResearch(LooseResearchModel):
    implications: list[EvidencePoint] = Field(default_factory=list)
    affected_assets_or_sectors: list[str] = Field(default_factory=list)
    transmission_channels: list[str] = Field(default_factory=list)


class ScenarioResearch(LooseResearchModel):
    base_case: str = ""
    upside_case: str = ""
    downside_case: str = ""
    counter_thesis: list[EvidencePoint] = Field(default_factory=list)
    signposts: list[str] = Field(default_factory=list)


class MeetingBrief(BaseModel):
    topic: str
    meeting_objective: str | None = None
    audience: str | None = None
    horizon: str | None = None
    executive_summary: str
    official_policy: OfficialPolicyResearch | None = None
    economic_data: EconomicDataResearch | None = None
    market_expectations: MarketExpectationsResearch | None = None
    portfolio_implications: PortfolioImplicationsResearch | None = None
    scenarios: ScenarioResearch | None = None
    discussion_questions: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    lane_errors: dict[str, str] = Field(default_factory=dict)
    sources: list[dict] = Field(default_factory=list)
