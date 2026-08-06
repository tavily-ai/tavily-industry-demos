"""Tolerant validation models for third-party Research output."""

from __future__ import annotations

from typing import Any, get_origin

from pydantic import BaseModel, ConfigDict, model_validator


class LooseResearchModel(BaseModel):
    """Preserve useful partial Research data instead of rejecting a whole lane."""

    model_config = ConfigDict(extra="allow", coerce_numbers_to_str=True)

    @model_validator(mode="before")
    @classmethod
    def coerce_common_shapes(cls, value: Any):
        if not isinstance(value, dict):
            return value
        normalized = dict(value)
        for name, field in cls.model_fields.items():
            if name not in normalized:
                continue
            if get_origin(field.annotation) is list:
                current = normalized[name]
                if current is None:
                    normalized[name] = []
                elif not isinstance(current, list):
                    normalized[name] = [current]
        return normalized
