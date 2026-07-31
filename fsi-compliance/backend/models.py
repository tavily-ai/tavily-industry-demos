"""Pydantic models for the compliance workbench API."""


from pydantic import BaseModel


class WatchlistRequest(BaseModel):
    max_clients: int | None = None


class InvestigateRequest(BaseModel):
    query: str
    flag_context: str | None = None
