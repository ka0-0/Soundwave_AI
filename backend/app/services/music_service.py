import logging
import httpx
from typing import List, Dict, Any, Optional
from app.config import get_settings

logger = logging.getLogger("soundwave.music_service")
settings = get_settings()

from app.services.deezer_service import deezer_service

class MusicService:
    def __init__(self):
        self.itunes_base_url = "https://itunes.apple.com/search"
        self.lastfm_base_url = "http://ws.audioscrobbler.com/2.0/"
        self.audd_base_url = "https://api.audd.io/"
        self.youtube_base_url = "https://www.googleapis.com/youtube/v3/search"
        
        self.lastfm_api_key = getattr(settings, "LASTFM_API_KEY", None)
        self.audd_api_key = getattr(settings, "AUDD_API_KEY", None)
        self.youtube_api_key = getattr(settings, "YOUTUBE_API_KEY", None)

    async def search_songs(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Fallback chaining: Deezer -> YouTube -> iTunes -> Last.fm"""
        # 1. Try Deezer (Primary)
        try:
            tracks = await deezer_service.search_songs(query, limit)
            if tracks:
                logger.info(f"Search successful via Deezer for: {query}")
                return tracks
        except Exception as e:
            logger.warning(f"Deezer search failed: {e}")

        # 2. Try YouTube
        try:
            tracks = await self._search_youtube(query, limit)
            if tracks:
                logger.info(f"Search successful via YouTube for: {query}")
                return tracks
        except Exception as e:
            logger.warning(f"YouTube search failed: {e}")

        # 4. Try iTunes
        try:
            tracks = await self._search_itunes(query, limit)
            if tracks:
                logger.info(f"Search successful via iTunes for: {query}")
                return tracks
        except Exception as e:
            logger.warning(f"iTunes search failed: {e}")

        # 5. Try Last.fm
        try:
            tracks = await self._search_lastfm(query, limit)
            if tracks:
                logger.info(f"Search successful via Last.fm for: {query}")
                return tracks
        except Exception as e:
            logger.warning(f"Last.fm search failed: {e}")

        return []

    async def _search_youtube(self, query: str, limit: int) -> List[Dict[str, Any]]:
        if not self.youtube_api_key:
            return []
            
        async with httpx.AsyncClient() as client:
            response = await client.get(self.youtube_base_url, params={
                "part": "snippet",
                "q": f"{query} music",
                "type": "video",
                "videoCategoryId": "10", # Music
                "maxResults": limit,
                "key": self.youtube_api_key
            })
            data = response.json()
            
            results = []
            for item in data.get("items", []):
                snippet = item["snippet"]
                results.append({
                    "id": item["id"]["videoId"],
                    "title": snippet["title"],
                    "artist": snippet["channelTitle"],
                    "album": "YouTube",
                    "cover_url": snippet["thumbnails"]["high"]["url"],
                    "preview_url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                    "duration": 0,
                    "popularity": 0,
                    "source": "youtube"
                })
            return results

    async def _search_deezer(self, query: str, limit: int) -> List[Dict[str, Any]]:
        return await deezer_service.search_songs(query, limit)

    async def _search_itunes(self, query: str, limit: int) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.get(self.itunes_base_url, params={
                "term": query,
                "limit": limit,
                "media": "music",
                "entity": "song"
            })
            data = response.json()
            
            results = []
            for track in data.get("results", []):
                results.append({
                    "id": str(track["trackId"]),
                    "title": track["trackName"],
                    "artist": track["artistName"],
                    "album": track["collectionName"],
                    "cover_url": track["artworkUrl100"].replace("100x100", "400x400"),
                    "preview_url": track.get("previewUrl"),
                    "duration": track["trackTimeMillis"] // 1000,
                    "popularity": 0,
                    "source": "itunes"
                })
            return results

    async def _search_lastfm(self, query: str, limit: int) -> List[Dict[str, Any]]:
        if not self.lastfm_api_key:
            return []
            
        async with httpx.AsyncClient() as client:
            response = await client.get(self.lastfm_base_url, params={
                "method": "track.search",
                "track": query,
                "api_key": self.lastfm_api_key,
                "format": "json",
                "limit": limit
            })
            data = response.json()
            
            results = []
            tracks = data.get("results", {}).get("trackmatches", {}).get("track", [])
            for track in tracks:
                # Last.fm search doesn't provide preview URLs or cover arts easily in search
                # We'd need to call track.getInfo for each, but that's slow.
                results.append({
                    "id": f"lastfm-{track['name']}-{track['artist']}",
                    "title": track["name"],
                    "artist": track["artist"],
                    "album": "Unknown",
                    "cover_url": "", 
                    "preview_url": "",
                    "duration": 0,
                    "popularity": int(track.get("listeners", 0)),
                    "source": "lastfm"
                })
            return results

    async def get_trending(self, limit: int = 10) -> List[Dict[str, Any]]:
        # 1. Try Deezer chart
        try:
            results = await deezer_service.get_trending(limit)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Failed to fetch trending via Deezer chart: {e}")

        # 2. Try searching for top hits (using the fallback chain in search_songs)
        try:
            results = await self.search_songs("top hits", limit)
            if results:
                return results
        except Exception as e:
            logger.warning(f"Failed to fetch top hits search: {e}")

        # 3. Fallback to local database songs
        try:
            from app.database import db
            songs = await db.songs.find({}).to_list(length=limit)
            results = []
            for s in songs:
                results.append({
                    "id": str(s.get("_id") or s.get("id")),
                    "title": s.get("title"),
                    "artist": s.get("artist"),
                    "album": s.get("album", "Local Album"),
                    "cover_url": s.get("cover_url", ""),
                    "preview_url": s.get("audio_url", ""),
                    "duration": s.get("duration_seconds", 0),
                    "popularity": 80,
                    "source": "local"
                })
            return results
        except Exception as e:
            logger.error(f"Fallback to local songs failed: {e}")
            return []


    async def recognize_audio(self, audio_content: bytes) -> Optional[Dict[str, Any]]:
        if not self.audd_api_key:
            return None
            
        try:
            async with httpx.AsyncClient() as client:
                files = {"file": audio_content}
                data = {"api_token": self.audd_api_key, "return": "deezer"}
                response = await client.post(self.audd_base_url, files=files, data=data)
                result = response.json()
                
                if result.get("status") == "success" and result.get("result"):
                    match = result["result"]
                    return {
                        "title": match["title"],
                        "artist": match["artist"],
                        "album": match["album"],
                        "deezer_id": match.get("deezer", {}).get("id"),
                        "cover_url": match.get("deezer", {}).get("album", {}).get("cover_medium")
                    }
        except Exception as e:
            logger.error(f"Audio recognition failed: {e}")
            
        return None

music_service = MusicService()
