"""Module-owned prompts and lane schemas for merchant research."""

from datetime import date
from backend.core.research import ResearchLane
from .schemas import (
    CategoryFitResearch, LegalRegulatoryResearch, MerchantIdentity,
    MerchantRiskRequest, ReputationResearch, RestrictedProductsResearch,
)

LANE_META = [
    ("identity", "Merchant Identity Resolution"),
    ("category_fit", "Category & Business-model Fit"),
    ("restricted_products", "Restricted Products & Services"),
    ("reputation", "Reputation & Business Practices"),
    ("legal_regulatory", "Legal & Regulatory Context"),
]


def identity_lane(request: MerchantRiskRequest) -> ResearchLane:
    query = f"""Resolve the exact public-web identity of this merchant before any risk research.
Today: {date.today().isoformat()}
Submitted merchant name: {request.merchant_name}
Submitted category code: {request.category_code}
Submitted domain: {request.domain or 'not provided'}
Submitted country: {request.country or 'not provided'}
Find first-party and authoritative corroboration. Do not merge similar names. Explicitly list ambiguity and alternative candidates. Confidence describes identity matching only. Every candidate and match basis must be source-grounded; do not guess missing fields."""
    return ResearchLane("identity", "Merchant Identity Resolution", query, MerchantIdentity)


def risk_lanes(request: MerchantRiskRequest, identity: dict | None) -> list[ResearchLane]:
    canonical = (identity or {}).get("canonical_name") or request.merchant_name
    domain = (identity or {}).get("canonical_domain") or request.domain or "not established"
    country = (identity or {}).get("country") or request.country or "not established"
    ambiguity = "; ".join((identity or {}).get("ambiguities") or []) or "none reported"
    common = f"""Research public-web context for the precisely scoped merchant below.
Today: {date.today().isoformat()}
Submitted name: {request.merchant_name}; submitted category code: {request.category_code}
Resolved name: {canonical}; domain: {domain}; country: {country}
Identity ambiguities: {ambiguity}
Do not silently combine findings from similarly named entities. Every indicator must include supporting source URLs. Absence of web evidence is an evidence gap, never proof of low risk. This is public-web review context, not an underwriting decision.
"""
    specs = [
        ("category_fit", "Category & Business-model Fit", CategoryFitResearch,
         "Compare observable products, services, and business model with the submitted category code. Use insufficient_evidence when coverage is inadequate."),
        ("restricted_products", "Restricted Products & Services", RestrictedProductsResearch,
         "Look for evidence of prohibited, age-restricted, regulated, deceptive, or category-inconsistent products/services. Record search gaps."),
        ("reputation", "Reputation & Business Practices", ReputationResearch,
         "Find credible patterns involving consumer harm, deceptive practices, fulfillment, charge complaints, or material reputational controversies. Distinguish isolated claims from patterns."),
        ("legal_regulatory", "Legal & Regulatory Context", LegalRegulatoryResearch,
         "Find relevant legal actions, regulator notices, license issues, sanctions, or enforcement in the resolved jurisdictions. Do not imply a clean record from no results."),
    ]
    return [ResearchLane(lane_id, label, f"{common}\nAssigned lane: {instruction}", schema) for lane_id, label, schema, instruction in specs]
