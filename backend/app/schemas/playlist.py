from datetime import datetime
from pydantic import BaseModel


class PlaylistCreate(BaseModel):
    name: str
    description: str = ""
    cover_url: str = ""


class PlaylistUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cover_url: str | None = None


class PlaylistOut(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    cover_url: str
    song_ids: list[str]
    created_at: datetime
    updated_at: datetime
