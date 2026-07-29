"""Chat model construction — the single place to swap providers/models."""

from langchain.chat_models import init_chat_model

MODEL = "openai:gpt-5.6-terra"


def get_llm():
    # gpt-5.6-terra on /v1/chat/completions rejects tool-calling unless
    # reasoning_effort is disabled.
    return init_chat_model(MODEL, reasoning_effort="none")
