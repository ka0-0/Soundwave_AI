from typing import List, Optional
from pydantic import BaseModel

class MusicTrack(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    cover_url: str
    preview_url: Optional[str] = None
    link: Optional[str] = None
    source: str = "deezer"

class SearchResponse(BaseModel):
    query: str
    tracks: List[MusicTrack]
    artists: List[dict] = []
    albums: List[dict] = []
