from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class UserPreferencesUpdate(BaseModel):
    language: str | None = Field(default=None, max_length=10)
    theme: str | None = Field(default=None, pattern="^(dark|light|high-contrast)$")
    high_contrast: bool | None = None
    font_scale: float | None = Field(default=None, ge=0.8, le=1.6)
    dashboard_settings: dict[str, Any] | None = None


class UserPreferencesOut(BaseModel):
    language: str = "en"
    theme: str = "dark"
    high_contrast: bool = False
    font_scale: float = 1.0
    dashboard_settings: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime | None = None


class WorkspaceBootstrap(BaseModel):
    preferences: UserPreferencesOut
    recent_searches: list[dict[str, Any]] = Field(default_factory=list)
    favorites: list[dict[str, Any]] = Field(default_factory=list)
    recently_played: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    recent_analyses: list[dict[str, Any]] = Field(default_factory=list)
    saved_reports: list[dict[str, Any]] = Field(default_factory=list)
    stats: dict[str, int] = Field(default_factory=dict)
