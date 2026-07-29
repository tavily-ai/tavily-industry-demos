"""Pydantic models for the compliance workbench API."""

from typing import Optional

from pydantic import BaseModel


class WatchlistRequest(BaseModel):
    max_clients: Optional[int] = None


class InvestigateRequest(BaseModel):
    query: str
    flag_context: Optional[str] = None
