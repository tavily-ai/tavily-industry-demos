"""Module-owned prompts and lane schemas for merchant research."""

from datetime import date
import json

from backend.core.research import ResearchLane

from .schemas import (
    CategoryFitResearch,
    LegalRegulatoryResearch,
    MerchantRiskRequest,
    ReputationResearch,
    RestrictedProductsResearch,
)

LANE_META = [
    ("identity", "Web identity checkpoint"),
    ("category_fit", "Category & Business-model Fit"),
    ("restricted_products", "Restricted Products & Services"),
    ("reputation", "Reputation & Business Practices"),
    ("legal_regulatory", "Legal & Regulatory Context"),
]


def risk_lanes(request: MerchantRiskRequest, identity: dict) -> list[ResearchLane]:
    canonical = identity.get("canonical_name") or request.merchant_name
    domain = identity.get("canonical_domain") or request.domain or "not established"
    country = identity.get("country") or request.country or "not established"
    scope = json.dumps(identity, ensure_ascii=False, indent=2)
    common = f"""Research public-web context for the precisely scoped merchant below.
Today: {date.today().isoformat()}
Submitted name: {request.merchant_name}
Submitted category code: {request.category_code}
Resolved name: {canonical}
Resolved domain: {domain}
Resolved country: {country}

Search + Extract identity checkpoint output:
{scope}

The unit of analysis is the merchant storefront/business represented by the submitted category and resolved domain, not every product or controversy associated with a parent company. Use the identity checkpoint as a scope boundary. Exclude similarly named businesses, authorized resellers, sister brands, unrelated parent-company products, marketplaces, financial products, media services, and other channels unless the evidence explicitly connects them to this merchant's own offering. If a parent or platform relationship is materially relevant, label that relationship and do not present it as a direct merchant finding.

Every indicator must include supporting source URLs. Absence of web evidence is an evidence gap, never proof of low risk.
"""
    specs = [
        (
            "category_fit",
            "Category & Business-model Fit",
            CategoryFitResearch,
            "Compare products, services, sales channels, and business model visibly offered by this exact merchant with the submitted category code. Use insufficient_evidence when coverage is inadequate.",
        ),
        (
            "restricted_products",
            "Restricted Products & Services",
            RestrictedProductsResearch,
            "Look only for evidence that this exact merchant offers prohibited, age-restricted, regulated, deceptive, or category-inconsistent products/services. Record scope and search gaps.",
        ),
        (
            "reputation",
            "Reputation & Business Practices",
            ReputationResearch,
            "Find credible patterns involving this merchant's consumer harm, deceptive practices, fulfillment, charge complaints, or material controversies. Distinguish isolated claims from patterns and parent-company issues from merchant issues.",
        ),
        (
            "legal_regulatory",
            "Legal & Regulatory Context",
            LegalRegulatoryResearch,
            "Find actions, regulator notices, licensing issues, sanctions, or enforcement that name or directly govern the resolved merchant/operator in the relevant jurisdiction. Do not imply a clean record from no results.",
        ),
    ]
    return [
        ResearchLane(lane_id, label, f"{common}\nAssigned lane: {instruction}", schema)
        for lane_id, label, schema, instruction in specs
    ]
