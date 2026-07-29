"""Screening agent: one adverse-media verdict per watchlist client."""

from langchain.agents import create_agent

from .llm import get_llm
from .prompts import SCREENING_SYSTEM_PROMPT
from .schemas import ScreeningVerdict
from .tools import TOOLS


def build_screening_agent():
    return create_agent(
        model=get_llm(),
        tools=TOOLS,
        system_prompt=SCREENING_SYSTEM_PROMPT,
        response_format=ScreeningVerdict,
    )


def client_task(client: dict) -> str:
    return (
        f"Screen this client for adverse media.\n"
        f"Client: {client['name']}\n"
        f"Country: {client.get('country', 'unknown')}\n"
        f"Industry: {client.get('industry', 'unknown')}\n"
        f"Objective: determine whether any recent adverse media warrants analyst review."
    )
