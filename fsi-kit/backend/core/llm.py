"""Chat model construction — the single place to swap providers/models."""

from langchain_nebius import ChatNebius

PROVIDER = "Nebius Token Factory"
MODEL = "nvidia/Nemotron-3-Ultra-550b-a55b"
FAST_MODEL = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B"


def get_llm(model: str = MODEL):
    return ChatNebius(model=model)


def get_fast_llm():
    return get_llm(FAST_MODEL)
