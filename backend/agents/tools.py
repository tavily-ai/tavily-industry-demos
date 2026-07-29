"""Shared Tavily tool instances used by both agents."""

from langchain_tavily import TavilySearch, TavilyExtract

search_tool = TavilySearch(
    max_results=10,
    search_depth="fast",
)

extract_tool = TavilyExtract(
    extract_depth="advanced",
)

TOOLS = [search_tool, extract_tool]
