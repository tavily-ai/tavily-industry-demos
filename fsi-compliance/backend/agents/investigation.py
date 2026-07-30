"""Investigation agent: full EDD case file for a single entity."""

from typing import Optional

from langchain.agents import create_agent

from .llm import get_llm
from .prompts import investigation_system_prompt
from .schemas import CaseFile
from .tools import TOOLS


def build_investigation_agent():
    return create_agent(
        model=get_llm(),
        tools=TOOLS,
        system_prompt=investigation_system_prompt(),
        response_format=CaseFile,
    )


def investigation_task(query: str, flag_context: Optional[str] = None) -> str:
    task = f"Build an enhanced due diligence case file for: {query}"
    if flag_context:
        task += (
            f"\n\nScreening context: this entity was flagged during daily adverse media "
            f"monitoring with the following note: \"{flag_context}\". Investigate this "
            f"thread first, then complete the full profile."
        )
    return task
