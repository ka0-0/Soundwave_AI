from fastapi import APIRouter, Header, Query
from app.services.auth_service import get_current_user
from app.services.analytics_service import heatmap, listening_time, mood_distribution, streaks, top_artists, top_genres, get_summary

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/listening-time")
async def api_listening_time(days: int = Query(default=7, ge=1, le=365), authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await listening_time(str(user["_id"]), days=days)


@router.get("/top-artists")
async def api_top_artists(limit: int = Query(default=10, ge=1, le=50), authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await top_artists(str(user["_id"]), limit=limit)


@router.get("/top-genres")
async def api_top_genres(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await top_genres(str(user["_id"]))


@router.get("/heatmap")
async def api_heatmap(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await heatmap(str(user["_id"]))


@router.get("/streaks")
async def api_streaks(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await streaks(str(user["_id"]))


@router.get("/mood-distribution")
async def api_mood_distribution(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await mood_distribution(str(user["_id"]))


@router.get("/summary")
async def api_summary(authorization: str = Header(default="")):
    user = await get_current_user(authorization.replace("Bearer ", ""))
    return await get_summary(str(user["_id"]))

