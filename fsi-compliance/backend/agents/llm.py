"""Chat model construction — the single place to swap providers/models."""

from langchain_nebius import ChatNebius

PROVIDER = "Nebius Token Factory"
MODEL = "nvidia/Nemotron-3-Ultra-550b-a55b"


def get_llm():
    return ChatNebius(model=MODEL)
