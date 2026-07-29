"""Shared Tavily tool instances used by both agents."""

from langchain_tavily import TavilySearch, TavilyExtract

search_tool = TavilySearch(
    max_results=20,
    topic="general",
)

extract_tool = TavilyExtract()

TOOLS = [search_tool, extract_tool]
