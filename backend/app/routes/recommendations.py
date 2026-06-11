import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Header, Query
from app.database import db, redis
from app.services.auth_service import get_current_user
from app.services.recommendation_engine import recommend, get_ai_dj_queue

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/ai-dj")
async def ai_dj(authorization: str = Header(default=""), limit: int = Query(default=10, le=25)):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await get_ai_dj_queue(str(user["_id"]), limit=limit)


@router.get("/personal")
async def personal(authorization: str = Header(default=""), limit: int = Query(default=20, le=50)):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    key = f"reco:personal:{user['_id']}:{limit}"
    cached = await redis.get(key)
    if cached:
        return json.loads(cached)
    recs = await recommend(str(user["_id"]), limit=limit)
    await redis.setex(key, 300, json.dumps(recs, default=str))
    return recs


@router.get("/mood/{mood}")
async def by_mood(mood: str, authorization: str = Header(default=""), limit: int = Query(default=20, le=50)):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await recommend(str(user["_id"]), mood=mood, limit=limit)


@router.get("/nostalgia")
async def nostalgia(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    cutoff_recent = datetime.utcnow() - timedelta(days=90)
    old = await db.play_events.find({"user_id": str(user["_id"]), "played_at": {"$lt": cutoff_recent}}).to_list(length=10000)
    grouped = {}
    for e in old:
        grouped[e["song_id"]] = grouped.get(e["song_id"], 0) + 1
    ids = [sid for sid, count in grouped.items() if count > 3]
    recent = await db.play_events.find({"user_id": str(user["_id"]), "played_at": {"$gte": cutoff_recent}}).to_list(length=10000)
    recent_ids = {e["song_id"] for e in recent}
    final_ids = [sid for sid in ids if sid not in recent_ids][:20]
    songs = await db.songs.find({"_id": {"$in": [__import__("bson").ObjectId(s) for s in final_ids]}}).to_list(length=100)
    out = []
    for s in songs:
        out.append(
            {
                "id": str(s["_id"]),
                "title": s["title"],
                "artist": s["artist"],
                "cover_url": s["cover_url"],
                "explanations": [f"You loved this in {s.get('release_year', 'an earlier era')}"],
            }
        )
    return out


@router.get("/smart-queue/{song_id}")
async def smart_queue(song_id: str, authorization: str = Header(default=""), limit: int = Query(default=10, le=25)):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    song = await db.songs.find_one({"_id": __import__("bson").ObjectId(song_id)})
    mood = song.get("mood_tags", [None])[0] if song else None
    return await recommend(str(user["_id"]), mood=mood, limit=limit)
