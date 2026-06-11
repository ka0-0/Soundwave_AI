from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException, Query
from app.database import db
from app.schemas.music import SongEventRequest, SongListResponse
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/songs", tags=["Songs"])


def serialize_song(song: dict) -> dict:
    return {
        "id": str(song["_id"]),
        "title": song["title"],
        "artist": song["artist"],
        "album": song["album"],
        "genre": song["genre"],
        "mood_tags": song["mood_tags"],
        "duration_seconds": song["duration_seconds"],
        "audio_url": song["audio_url"],
        "cover_url": song["cover_url"],
        "release_year": song["release_year"],
        "features": song["features"],
    }


@router.get("", response_model=SongListResponse)
async def list_songs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    genre: str | None = None,
    mood: str | None = None,
):
    q = {}
    if genre:
        q["genre"] = genre
    if mood:
        q["mood_tags"] = mood
    total = await db.songs.count_documents(q)
    cursor = db.songs.find(q).skip((page - 1) * page_size).limit(page_size)
    items = [serialize_song(s) async for s in cursor]
    return SongListResponse(items=items, page=page, page_size=page_size, total=total)


@router.get("/{song_id}")
async def song_detail(song_id: str):
    song = await db.songs.find_one({"_id": ObjectId(song_id)})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return serialize_song(song)


@router.post("/{song_id}/play")
async def log_play(song_id: str, payload: SongEventRequest, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    song = await db.songs.find_one({"_id": ObjectId(song_id)})
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    await db.play_events.insert_one(
        {
            "user_id": str(user["_id"]),
            "song_id": song_id,
            "played_at": datetime.utcnow(),
            "duration_played": payload.duration_played or song["duration_seconds"],
            "skipped": False,
            "skip_at_second": None,
            "source": payload.source,
        }
    )
    return {"message": "Play event logged"}


@router.post("/{song_id}/skip")
async def log_skip(song_id: str, payload: SongEventRequest, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    await db.play_events.insert_one(
        {
            "user_id": str(user["_id"]),
            "song_id": song_id,
            "played_at": datetime.utcnow(),
            "duration_played": payload.duration_played,
            "skipped": True,
            "skip_at_second": payload.skip_at_second,
            "source": payload.source,
        }
    )
    return {"message": "Skip event logged"}


@router.post("/{song_id}/like")
async def toggle_like(song_id: str, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    existing = await db.liked_songs.find_one({"user_id": str(user["_id"]), "song_id": song_id})
    if existing:
        await db.liked_songs.delete_one({"_id": existing["_id"]})
        return {"message": "Song unliked"}
    await db.liked_songs.insert_one({"user_id": str(user["_id"]), "song_id": song_id, "liked_at": datetime.utcnow()})
    return {"message": "Song liked"}
