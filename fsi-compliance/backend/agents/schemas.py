"""Structured output models for agent responses."""

from typing import Literal

from pydantic import BaseModel, Field


class EvidenceItem(BaseModel):
    headline: str = Field(description="Concise factual title of the news item")
    url: str = Field(description="Direct URL to the source article")
    quoted_passage: str = Field(description="Verbatim passage from the article supporting the finding")
    date: str | None = Field(default=None, description="Publication date of the article if known")


class ScreeningVerdict(BaseModel):
    verdict: Literal["clear", "review", "escalate"] = Field(
        description="clear = no adverse media found; review = ambiguous or moderate-risk items; escalate = serious adverse media"
    )
    risk_categories: list[str] = Field(
        default_factory=list,
        description="Risk categories identified, e.g. money laundering, sanctions, bribery, fraud, regulatory action",
    )
    summary: str = Field(description="2-3 sentence analyst-style summary of what was found and why this verdict was reached")
    evidence: list[EvidenceItem] = Field(
        default_factory=list,
        description="Source-backed evidence items. Empty when verdict is clear.",
    )
    searches_performed: list[str] = Field(
        default_factory=list,
        description="The search queries the agent issued during screening",
    )


class Leader(BaseModel):
    name: str
    title: str


class Finding(BaseModel):
    headline: str = Field(description="Concise factual title of the finding")
    date: str | None = Field(default=None, description="Date of the event or article")
    summary: str = Field(description="2-3 sentences: what happened, parties involved, outcome or current status")
    risk_category: str = Field(description="Primary risk category, e.g. money laundering, sanctions, bribery, fraud")
    severity: Literal["low", "medium", "high", "critical"]
    url: str = Field(description="Direct URL to the primary source")
    quoted_passage: str = Field(description="Verbatim passage from the source supporting this finding")


class CaseFile(BaseModel):
    legal_name: str = Field(description="Official registered legal name of the entity")
    hq_address: str | None = Field(default=None, description="Headquarters address")
    naics_code: str | None = Field(default=None, description="NAICS industry classification code")
    industry: str | None = Field(default=None, description="Primary industry")
    country: str | None = Field(default=None, description="Country of incorporation / headquarters")
    leadership: list[Leader] = Field(default_factory=list, description="Executive leadership (C-suite, SVPs); exclude board members")
    findings: list[Finding] = Field(default_factory=list, description="Adverse media findings with citations")
    risk_rating: Literal["low", "medium", "high", "critical"] = Field(
        description="Overall entity risk rating for AML/KYC purposes"
    )
    recommended_action: str = Field(description="Recommended next step for the investigator")
    summary: str = Field(description="Executive summary of the entity profile and risk posture, 3-4 sentences")
    searches_performed: list[str] = Field(
        default_factory=list,
        description="The search queries the agent issued during the investigation",
    )
