from datetime import datetime
from pydantic import BaseModel


class SongFeatures(BaseModel):
    energy: float
    valence: float
    tempo: float
    danceability: float


class Song(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    genre: list[str]
    mood_tags: list[str]
    duration_seconds: int
    audio_url: str
    cover_url: str
    release_year: int
    features: SongFeatures


class SongEventRequest(BaseModel):
    duration_played: int | None = None
    skip_at_second: int | None = None
    source: str = "search"


class SongListResponse(BaseModel):
    items: list[Song]
    page: int
    page_size: int
    total: int


class PlayEvent(BaseModel):
    user_id: str
    song_id: str
    played_at: datetime
    duration_played: int | None = None
    skipped: bool = False
    skip_at_second: int | None = None
    source: str
