from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Any

from app.schemas.workspace import UserPreferencesOut, UserPreferencesUpdate, WorkspaceBootstrap
from app.services.auth_service import get_current_user
from app.services import workspace_service as ws

router = APIRouter(prefix="/workspace", tags=["Workspace"])


async def _user(authorization: str = Header(default="")):
    return await get_current_user(authorization.replace("Bearer ", ""))


class FavoritePayload(BaseModel):
    track_id: str
    track_data: dict[str, Any] = {}


class RecentlyPlayedPayload(BaseModel):
    song_id: str
    track_data: dict[str, Any] = {}


@router.get("/bootstrap", response_model=WorkspaceBootstrap)
async def bootstrap(authorization: str = Header(default="")):
    user = await _user(authorization)
    return await ws.bootstrap_workspace(str(user["_id"]))


@router.get("/preferences", response_model=UserPreferencesOut)
async def get_preferences(authorization: str = Header(default="")):
    user = await _user(authorization)
    return await ws.get_preferences(str(user["_id"]))


@router.put("/preferences", response_model=UserPreferencesOut)
async def update_preferences(payload: UserPreferencesUpdate, authorization: str = Header(default="")):
    user = await _user(authorization)
    return await ws.update_preferences(str(user["_id"]), payload.model_dump(exclude_unset=True))


@router.post("/search")
async def save_search(query: str, search_type: str = "song", results_count: int = 0, authorization: str = Header(default="")):
    user = await _user(authorization)
    await ws.save_search(str(user["_id"]), query, search_type, results_count)
    return {"status": "saved"}


@router.post("/favorites")
async def toggle_favorite(payload: FavoritePayload, authorization: str = Header(default="")):
    user = await _user(authorization)
    return await ws.toggle_favorite(str(user["_id"]), payload.track_id, payload.track_data)


@router.post("/recently-played")
async def save_recently_played(payload: RecentlyPlayedPayload, authorization: str = Header(default="")):
    user = await _user(authorization)
    await ws.save_recently_played(str(user["_id"]), payload.song_id, payload.track_data)
    return {"status": "saved"}


@router.get("/ai-dj")
async def get_ai_dj_queue(authorization: str = Header(default="")):
    user = await _user(authorization)
    return await ws.generate_ai_dj_queue(str(user["_id"]))
