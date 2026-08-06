"""Pydantic models for Compliance Intelligence APIs."""

from pydantic import BaseModel, Field


class WatchlistRequest(BaseModel):
    max_clients: int | None = Field(default=None, ge=1, le=100)


class InvestigateRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    flag_context: str | None = Field(default=None, max_length=2000)
