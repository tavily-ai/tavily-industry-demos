from tavily import AsyncTavilyClient

CLIENT_NAME = "public-usecases--travel-hospitality-intelligence-agent"


def async_tavily_client(api_key: str | None = None) -> AsyncTavilyClient:
    return AsyncTavilyClient(api_key=api_key, client_name=CLIENT_NAME)
