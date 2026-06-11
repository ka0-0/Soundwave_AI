import logging
from datetime import datetime
from typing import Any
import asyncio

from bson import ObjectId

from app.database import db

logger = logging.getLogger("soundwave.workspace")

DEFAULT_PREFERENCES = {
    "language": "en",
    "theme": "dark",
    "high_contrast": False,
    "font_scale": 1.0,
    "dashboard_settings": {},
}


def _now() -> datetime:
    return datetime.utcnow()


def _parse_dt(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", ""))
    return _now()


async def initialize_user_workspace(user_id: str) -> None:
    existing = await db.user_preferences.find_one({"user_id": user_id})
    if existing:
        return
    now = _now()
    await db.user_preferences.insert_one({
        "user_id": user_id,
        **DEFAULT_PREFERENCES,
        "created_at": now,
        "updated_at": now,
    })
    logger.info("Initialized workspace for user %s", user_id)


async def get_preferences(user_id: str) -> dict[str, Any]:
    prefs = await db.user_preferences.find_one({"user_id": user_id})
    if not prefs:
        await initialize_user_workspace(user_id)
        prefs = await db.user_preferences.find_one({"user_id": user_id})
    return {
        "language": prefs.get("language", "en"),
        "theme": prefs.get("theme", "dark"),
        "high_contrast": bool(prefs.get("high_contrast", False)),
        "font_scale": float(prefs.get("font_scale", 1.0)),
        "dashboard_settings": prefs.get("dashboard_settings", {}),
        "updated_at": _parse_dt(prefs.get("updated_at")),
    }


async def update_preferences(user_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    await initialize_user_workspace(user_id)
    payload = {k: v for k, v in updates.items() if v is not None}
    if payload:
        payload["updated_at"] = _now()
        await db.user_preferences.update_one({"user_id": user_id}, {"$set": payload})
    return await get_preferences(user_id)


async def get_recent_searches(user_id: str, limit: int = 20) -> list[dict]:
    rows = await db.user_searches.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    return [{"id": str(r["_id"]), "query": r["query"], "search_type": r.get("search_type", "song"),
             "results_count": r.get("results_count", 0), "created_at": _parse_dt(r.get("created_at"))} for r in rows]


async def save_search(user_id: str, query: str, search_type: str, results_count: int) -> None:
    await db.user_searches.insert_one({
        "user_id": user_id,
        "query": query,
        "search_type": search_type,
        "results_count": results_count,
        "created_at": _now()
    })


async def get_favorites(user_id: str, limit: int = 50) -> list[dict]:
    rows = await db.favorites.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    return [{"id": str(r["_id"]), "track_id": r["track_id"],
             "track_data": r.get("track_data", {}), "created_at": _parse_dt(r.get("created_at"))} for r in rows]


async def toggle_favorite(user_id: str, track_id: str, track_data: dict) -> dict:
    existing = await db.favorites.find_one({"user_id": user_id, "track_id": track_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"status": "removed"}
    else:
        await db.favorites.insert_one({
            "user_id": user_id,
            "track_id": track_id,
            "track_data": track_data,
            "created_at": _now()
        })
        return {"status": "added"}


async def get_recent_analyses(user_id: str, limit: int = 20) -> list[dict]:
    rows = await db.music_analyses.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    return [{"id": str(r["_id"]), "track_id": r.get("track_id"), "track_name": r["track_name"],
             "artist_name": r.get("artist_name"), "insights": r.get("insights", {}),
             "created_at": _parse_dt(r.get("created_at"))} for r in rows]


async def get_saved_reports(user_id: str, limit: int = 20) -> list[dict]:
    rows = await db.saved_reports.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    return [{"id": str(r["_id"]), "title": r["title"], "track_data": r.get("track_data", {}),
             "insights": r.get("insights", {}), "created_at": _parse_dt(r.get("created_at"))} for r in rows]


async def bootstrap_workspace(user_id: str) -> dict[str, Any]:
    await initialize_user_workspace(user_id)
    
    searches_task = get_recent_searches(user_id)
    favorites_task = get_favorites(user_id)
    analyses_task = get_recent_analyses(user_id)
    reports_task = get_saved_reports(user_id)
    prefs_task = get_preferences(user_id)
    recently_played_task = get_recently_played(user_id)
    recommendations_task = get_recommendations(user_id)
    
    (
        searches,
        favorites,
        analyses,
        reports,
        prefs,
        recently_played,
        recommendations
    ) = await asyncio.gather(
        searches_task,
        favorites_task,
        analyses_task,
        reports_task,
        prefs_task,
        recently_played_task,
        recommendations_task
    )

    return {
        "preferences": prefs,
        "recent_searches": searches,
        "favorites": favorites,
        "recently_played": recently_played,
        "recommendations": recommendations,
        "recent_analyses": analyses,
        "saved_reports": reports,
        "recommendation_history": [],
        "stats": {"searches": len(searches), "favorites": len(favorites),
                  "analyses": len(analyses), "reports": len(reports)},
    }

async def get_recently_played(user_id: str, limit: int = 20) -> list[dict]:
    rows = await db.recently_played.find({"user_id": user_id}).sort("played_at", -1).to_list(limit)
    return [{"id": str(r["_id"]), "song_id": r["song_id"], "track_data": r["track_data"], "played_at": _parse_dt(r["played_at"])} for r in rows]

async def save_recently_played(user_id: str, song_id: str, track_data: dict) -> None:
    await db.recently_played.insert_one({
        "user_id": user_id,
        "song_id": song_id,
        "track_data": track_data,
        "played_at": _now()
    })

async def get_recommendations(user_id: str, limit: int = 10) -> list[dict]:
    rows = await db.recommendations.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    return [{"id": str(r["_id"]), "track_id": r["track_id"], "track_data": r["track_data"], "reason": r["reason"], "created_at": _parse_dt(r["created_at"])} for r in rows]

async def generate_ai_dj_queue(user_id: str) -> list[dict]:
    # AI DJ logic: 
    # 1. Get user's favorites
    # 2. Get user's recently played
    # 3. Get similar tracks from music_service or recommendation_engine
    # For now, let's return a mix of favorites and similar trending tracks
    favorites = await get_favorites(user_id, limit=5)
    from app.services.music_service import music_service
    trending = await music_service.get_trending(limit=10)
    
    queue = []
    if favorites:
        for f in favorites:
            queue.append(f["track_data"])
    
    for t in trending:
        if not any(q["id"] == t["id"] for q in queue):
            queue.append(t)
            
    import random
    random.shuffle(queue)
    return queue[:20]
