from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class AnalysisCreate(BaseModel):
    track_name: str = Field(min_length=1, max_length=120)
    artist_name: str | None = Field(default="", max_length=120)

    @field_validator("track_name", "artist_name")
    @classmethod
    def trim_text(cls, value: str | None) -> str:
        return (value or "").strip()


class AnalysisComplete(BaseModel):
    result: dict[str, Any] = Field(default_factory=dict)


class AnalysisResponse(BaseModel):
    id: str
    user_id: str
    track_name: str
    artist_name: str | None = ""
    status: str
    result: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None
