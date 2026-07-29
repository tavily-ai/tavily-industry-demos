"""Chat model construction — the single place to swap providers/models."""

from langchain.chat_models import init_chat_model

MODEL = "openai:gpt-5.6-terra"


def get_llm():
    return init_chat_model(MODEL, use_responses_api=True)
