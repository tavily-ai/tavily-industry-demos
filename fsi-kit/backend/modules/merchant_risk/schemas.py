"""Typed inputs and structured outputs for merchant-risk research."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field, field_validator


class MerchantRiskRequest(BaseModel):
    merchant_name: str = Field(min_length=2, max_length=300)
    category_code: str = Field(min_length=2, max_length=50)
    domain: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=150)

    @field_validator("merchant_name", "category_code", "domain", "country")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class MerchantEvidence(BaseModel):
    finding: str
    significance: str
    source_urls: list[str] = Field(default_factory=list)
    observed_date: str | None = None


class IdentityCandidate(BaseModel):
    name: str
    domain: str | None = None
    country: str | None = None
    rationale: str
    source_urls: list[str] = Field(default_factory=list)


class MerchantIdentity(BaseModel):
    canonical_name: str | None = None
    canonical_domain: str | None = None
    country: str | None = None
    business_description: str | None = None
    confidence: Literal["low", "medium", "high"]
    match_basis: list[str] = Field(default_factory=list)
    ambiguities: list[str] = Field(default_factory=list)
    alternative_candidates: list[IdentityCandidate] = Field(default_factory=list)


class CategoryFitResearch(BaseModel):
    observed_offerings: list[MerchantEvidence] = Field(default_factory=list)
    category_fit: Literal["consistent", "mixed", "inconsistent", "insufficient_evidence"]
    explanation: str


class RestrictedProductsResearch(BaseModel):
    indicators: list[MerchantEvidence] = Field(default_factory=list)
    products_reviewed: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)


class ReputationResearch(BaseModel):
    indicators: list[MerchantEvidence] = Field(default_factory=list)
    themes: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)


class LegalRegulatoryResearch(BaseModel):
    indicators: list[MerchantEvidence] = Field(default_factory=list)
    jurisdictions_checked: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)


class WebRiskContext(BaseModel):
    merchant_name: str
    category_code: str
    resolved_identity: MerchantIdentity | None = None
    identity_confidence: Literal["low", "medium", "high", "unresolved"]
    identity_ambiguities: list[str] = Field(default_factory=list)
    category_fit: CategoryFitResearch | None = None
    restricted_products: RestrictedProductsResearch | None = None
    reputation: ReputationResearch | None = None
    legal_regulatory: LegalRegulatoryResearch | None = None
    web_context_level: Literal["insufficient_evidence", "no_material_indicators_found", "review_indicated"]
    evidence_coverage: Literal["weak", "partial", "strong"]
    risk_indicators: list[MerchantEvidence] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    next_checks: list[str] = Field(default_factory=list)
    lane_errors: dict[str, str] = Field(default_factory=dict)
    sources: list[dict] = Field(default_factory=list)
