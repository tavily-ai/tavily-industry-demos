"""Chat model construction — the single place to swap providers/models."""

from langchain_openai import ChatOpenAI

PROVIDER = "OpenAI"
MODEL = "gpt-5.6-luna"
FAST_MODEL = "gpt-5.6-luna"


def get_llm(model: str = MODEL):
    return ChatOpenAI(model=model, use_responses_api=True)


def get_fast_llm():
    return get_llm(FAST_MODEL)
