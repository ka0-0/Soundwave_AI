import logging
import httpx
import json
import asyncio
from typing import List, Dict, Any, Optional
from app.database import redis

logger = logging.getLogger("soundwave.deezer_service")

class DeezerService:
    def __init__(self):
        self.base_url = "https://api.deezer.com"
        self._client = None
        self._loop = None

    def _get_client(self) -> httpx.AsyncClient:
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            current_loop = None

        if self._client is None or self._client.is_closed or self._loop != current_loop:
            self._client = httpx.AsyncClient(timeout=2.0)
            self._loop = current_loop
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def search_songs(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        logger.info(f"Deezer Request Start: search_songs (query={query}, limit={limit})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/search", params={"q": query, "limit": limit})
            response.raise_for_status()
            data = response.json()
            
            results = []
            for track in data.get("data", []):
                results.append(self._map_track(track))
            logger.info(f"Deezer Request End: search_songs (query={query}, limit={limit}) -> count={len(results)}")
            return results
        except Exception as e:
            logger.error(f"Deezer search failed: {e}")
            return []

    async def get_trending(self, limit: int = 10) -> List[Dict[str, Any]]:
        logger.info(f"Deezer Request Start: get_trending (limit={limit})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/chart/0/tracks", params={"limit": limit})
            response.raise_for_status()
            data = response.json()
            
            results = []
            for track in data.get("data", []):
                results.append(self._map_track(track))
            logger.info(f"Deezer Request End: get_trending (limit={limit}) -> count={len(results)}")
            return results
        except Exception as e:
            logger.error(f"Deezer trending failed: {e}")
            return []

    async def get_track(self, track_id: str) -> Optional[Dict[str, Any]]:
        logger.info(f"Deezer Request Start: get_track (id={track_id})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/track/{track_id}")
            response.raise_for_status()
            logger.info(f"Deezer Request End: get_track (id={track_id}) -> success")
            return self._map_track(response.json())
        except Exception as e:
            logger.error(f"Deezer get_track failed: {e}")
            return None

    async def get_artist(self, artist_id: str) -> Optional[Dict[str, Any]]:
        logger.info(f"Deezer Request Start: get_artist (id={artist_id})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/artist/{artist_id}")
            response.raise_for_status()
            logger.info(f"Deezer Request End: get_artist (id={artist_id}) -> success")
            return response.json()
        except Exception as e:
            logger.error(f"Deezer get_artist failed: {e}")
            return None

    async def get_album(self, album_id: str) -> Optional[Dict[str, Any]]:
        logger.info(f"Deezer Request Start: get_album (id={album_id})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/album/{album_id}")
            response.raise_for_status()
            logger.info(f"Deezer Request End: get_album (id={album_id}) -> success")
            return response.json()
        except Exception as e:
            logger.error(f"Deezer get_album failed: {e}")
            return None

    async def search_artist_by_name(self, artist_name: str) -> Optional[Dict[str, Any]]:
        cache_key = f"deezer:artist_search:{artist_name.lower().strip()}"
        try:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache read failed in search_artist_by_name: {e}")

        logger.info(f"Deezer Request Start: search_artist_by_name (name={artist_name})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/search/artist", params={"q": artist_name, "limit": 1})
            response.raise_for_status()
            data = response.json()
            if data.get("data"):
                artist = data["data"][0]
                try:
                    await redis.setex(cache_key, 86400, json.dumps(artist))
                except Exception as e:
                    logger.warning(f"Cache write failed in search_artist_by_name: {e}")
                logger.info(f"Deezer Request End: search_artist_by_name (name={artist_name}) -> found")
                return artist
        except Exception as e:
            logger.error(f"Deezer search_artist_by_name failed for {artist_name}: {e}")
        return None

    async def get_related_artists(self, artist_id: str) -> List[Dict[str, Any]]:
        cache_key = f"deezer:related_artists:{artist_id}"
        try:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache read failed in get_related_artists: {e}")

        logger.info(f"Deezer Request Start: get_related_artists (id={artist_id})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/artist/{artist_id}/related", params={"limit": 5})
            response.raise_for_status()
            data = response.json()
            artists = data.get("data", [])
            try:
                await redis.setex(cache_key, 86400, json.dumps(artists))
            except Exception as e:
                logger.warning(f"Cache write failed in get_related_artists: {e}")
            logger.info(f"Deezer Request End: get_related_artists (id={artist_id}) -> count={len(artists)}")
            return artists
        except Exception as e:
            logger.error(f"Deezer get_related_artists failed for {artist_id}: {e}")
            return []

    async def get_artist_top_tracks(self, artist_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        cache_key = f"deezer:artist_top_tracks:{artist_id}:{limit}"
        try:
            cached = await redis.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Cache read failed in get_artist_top_tracks: {e}")

        logger.info(f"Deezer Request Start: get_artist_top_tracks (id={artist_id}, limit={limit})")
        client = self._get_client()
        try:
            response = await client.get(f"{self.base_url}/artist/{artist_id}/top", params={"limit": limit})
            response.raise_for_status()
            data = response.json()
            tracks = []
            for track in data.get("data", []):
                tracks.append(self._map_track(track))
            try:
                await redis.setex(cache_key, 86400, json.dumps(tracks))
            except Exception as e:
                logger.warning(f"Cache write failed in get_artist_top_tracks: {e}")
            logger.info(f"Deezer Request End: get_artist_top_tracks (id={artist_id}, limit={limit}) -> count={len(tracks)}")
            return tracks
        except Exception as e:
            logger.error(f"Deezer get_artist_top_tracks failed for {artist_id}: {e}")
            return []

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
