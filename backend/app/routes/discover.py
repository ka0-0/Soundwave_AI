import logging
from typing import Any, List
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from app.services.music_service import music_service
from app.schemas.discover import SearchResponse

router = APIRouter(prefix="/discover", tags=["Discover"])

@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    try:
        tracks = await music_service.search_songs(q, limit)
        return {"query": q, "tracks": tracks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/trending")
async def trending(limit: int = Query(10, ge=1, le=50)):
    try:
        return await music_service.get_trending(limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    try:
        content = await file.read()
        match = await music_service.recognize_audio(content)
        if not match:
            return {"status": "not_found", "message": "Could not recognize the song."}
        return {"status": "success", "result": match}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
