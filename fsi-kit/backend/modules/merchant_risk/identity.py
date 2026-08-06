"""LangChain Search + Extract agent for the Merchant Risk identity checkpoint."""

from __future__ import annotations

from datetime import date

from langchain.agents import create_agent

from backend.core.llm import get_fast_llm
from backend.core.tools import TOOLS

from .schemas import MerchantIdentity, MerchantRiskRequest


def identity_system_prompt() -> str:
    return f"""You resolve the public-web identity of a submitted merchant before risk research begins.
Today is {date.today().isoformat()}.

Required workflow and hard tool budget:
1. Make exactly one Tavily Search call. Put the submitted name, domain, country, and merchant category into one focused query.
2. From those results, make at most one Tavily Extract call containing the likely first-party site and up to two useful corroborating pages.
3. Immediately return the structured MerchantIdentity response. If the single Search and Extract are insufficient, return low or unresolved confidence instead of doing more searches.

Identity rules:
- Treat a submitted domain as a hypothesis, not proof.
- Do not merge similarly named companies, resellers, parent-company products, sister brands, or marketplaces.
- canonical_name and canonical_domain describe the exact web merchant that should be handed to the downstream lanes.
- confidence describes identity matching only. Use high only when first-party evidence and another credible source agree. Use medium for a unique but incompletely corroborated match. Use low or unresolved for conflicts or ambiguity.
- Put concise evidence-based reasons in match_basis and disclose competing candidates in alternative_candidates.
- Missing evidence must produce ambiguity, never invented details.
"""


def identity_task(request: MerchantRiskRequest) -> str:
    return f"""Resolve this merchant's public-web identity for a scoped risk-research handoff.
Submitted merchant name: {request.merchant_name}
Submitted merchant category: {request.category_code}
Submitted domain: {request.domain or "not provided"}
Submitted country: {request.country or "not provided"}

Stop after identity resolution. Do not research reputation, restricted products, or legal risk in this step."""


def build_identity_agent():
    return create_agent(
        model=get_fast_llm(),
        tools=TOOLS,
        system_prompt=identity_system_prompt(),
        response_format=MerchantIdentity,
    )
