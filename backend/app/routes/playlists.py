from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Header, HTTPException
from app.database import db
from app.schemas.playlist import PlaylistCreate, PlaylistUpdate
from app.services.auth_service import get_current_user
from app.services.recommendation_engine import invalidate_dashboard_cache

router = APIRouter(prefix="/playlists", tags=["Playlists"])


def serialize(p: dict):
    p["id"] = str(p["_id"])
    del p["_id"]
    return p


@router.get("")
async def get_playlists(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    docs = await db.playlists.find({"user_id": str(user["_id"])}).to_list(length=300)
    return [serialize(d) for d in docs]


@router.post("")
async def create_playlist(payload: PlaylistCreate, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    now = datetime.utcnow()
    doc = {
        "user_id": str(user["_id"]),
        "name": payload.name,
        "description": payload.description,
        "cover_url": payload.cover_url,
        "song_ids": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.playlists.insert_one(doc)
    doc["_id"] = result.inserted_id
    await invalidate_dashboard_cache(str(user["_id"]))
    return serialize(doc)


@router.put("/{playlist_id}")
async def update_playlist(playlist_id: str, payload: PlaylistUpdate, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    p = await db.playlists.find_one({"_id": ObjectId(playlist_id), "user_id": str(user["_id"])})
    if not p:
        raise HTTPException(status_code=404, detail="Playlist not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()
    await db.playlists.update_one({"_id": ObjectId(playlist_id)}, {"$set": updates})
    new_doc = await db.playlists.find_one({"_id": ObjectId(playlist_id)})
    await invalidate_dashboard_cache(str(user["_id"]))
    return serialize(new_doc)


@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    res = await db.playlists.delete_one({"_id": ObjectId(playlist_id), "user_id": str(user["_id"])})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await invalidate_dashboard_cache(str(user["_id"]))
    return {"message": "Playlist deleted"}


@router.post("/{playlist_id}/songs")
async def add_song(playlist_id: str, song_id: str, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    await db.playlists.update_one(
        {"_id": ObjectId(playlist_id), "user_id": str(user["_id"])},
        {"$addToSet": {"song_ids": song_id}, "$set": {"updated_at": datetime.utcnow()}},
    )
    await invalidate_dashboard_cache(str(user["_id"]))
    return {"message": "Song added"}


@router.delete("/{playlist_id}/songs/{song_id}")
async def remove_song(playlist_id: str, song_id: str, authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    await db.playlists.update_one(
        {"_id": ObjectId(playlist_id), "user_id": str(user["_id"])},
        {"$pull": {"song_ids": song_id}, "$set": {"updated_at": datetime.utcnow()}},
    )
    await invalidate_dashboard_cache(str(user["_id"]))
    return {"message": "Song removed"}
