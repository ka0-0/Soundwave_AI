import logging
import httpx
from typing import List, Dict, Any, Optional

logger = logging.getLogger("soundwave.deezer_service")

class DeezerService:
    def __init__(self):
        self.base_url = "https://api.deezer.com"

    async def search_songs(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.0) as client:
            try:
                response = await client.get(f"{self.base_url}/search", params={"q": query, "limit": limit})
                response.raise_for_status()
                data = response.json()
                
                results = []
                for track in data.get("data", []):
                    results.append(self._map_track(track))
                return results
            except Exception as e:
                logger.error(f"Deezer search failed: {e}")
                return []

    async def get_trending(self, limit: int = 10) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.0) as client:
            try:
                response = await client.get(f"{self.base_url}/chart/0/tracks", params={"limit": limit})
                response.raise_for_status()
                data = response.json()
                
                results = []
                for track in data.get("data", []):
                    results.append(self._map_track(track))
                return results
            except Exception as e:
                logger.error(f"Deezer trending failed: {e}")
                return []


    async def get_track(self, track_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/track/{track_id}")
                response.raise_for_status()
                return self._map_track(response.json())
            except Exception as e:
                logger.error(f"Deezer get_track failed: {e}")
                return None

    async def get_artist(self, artist_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/artist/{artist_id}")
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Deezer get_artist failed: {e}")
                return None

    async def get_album(self, album_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/album/{album_id}")
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Deezer get_album failed: {e}")
                return None

    def _map_track(self, track: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": str(track.get("id")),
            "title": track.get("title"),
            "artist": track.get("artist", {}).get("name"),
            "album": track.get("album", {}).get("title"),
            "cover_url": track.get("album", {}).get("cover_medium"),
            "preview_url": track.get("preview"),
            "duration": track.get("duration"),
            "popularity": track.get("rank", 0),
            "link": track.get("link"),
            "source": "deezer"
        }

deezer_service = DeezerService()
