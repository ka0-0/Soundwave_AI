import logging
from typing import List
from fastapi import APIRouter, Header, HTTPException, status, Depends
from app.database import db
from app.services.auth_service import get_current_user
from app.services.avatar_service import avatar_service
from app.schemas.avatars import AvatarGenerateRequest, AvatarResponse, AvatarUpdate
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger("soundwave.avatar_routes")
router = APIRouter(prefix="/avatars", tags=["AI Avatar Studio"])

@router.post("/generate", response_model=AvatarResponse)
async def generate_avatar(payload: AvatarGenerateRequest, authorization: str = Header(default="")):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)
    user_id = str(user["_id"])

    try:
        result = await avatar_service.create_avatar(payload.mood, payload.style, payload.image_data)
        
        avatar_doc = {
            "user_id": user_id,
            "image_url": result["image_url"],
            "original_image_url": None, # If payload.image_data was saved to storage
            "mood": payload.mood,
            "style": payload.style,
            "name": f"{payload.style} {payload.mood} Avatar",
            "metadata": result["metadata"],
            "created_at": datetime.utcnow().isoformat()
        }
        
        db_result = await db.ai_avatars.insert_one(avatar_doc)
        avatar_doc["id"] = db_result.inserted_id
        
        return AvatarResponse(**avatar_doc)
    except Exception as e:
        logger.error(f"Avatar generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI avatar")

@router.get("/my", response_model=List[AvatarResponse])
async def get_my_avatars(authorization: str = Header(default="")):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)
    user_id = str(user["_id"])

    rows = await db.ai_avatars.find({"user_id": user_id}).sort("created_at", -1).to_list()
    return [AvatarResponse(**row) for row in rows]

@router.patch("/{avatar_id}", response_model=AvatarResponse)
async def update_avatar(avatar_id: str, payload: AvatarUpdate, authorization: str = Header(default="")):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)
    
    avatar = await db.ai_avatars.find_one({"_id": avatar_id, "user_id": str(user["_id"])})
    if not avatar:
        raise HTTPException(status_code=404, detail="Avatar not found")

    update_data = payload.dict(exclude_unset=True)
    if update_data:
        await db.ai_avatars.update_one({"_id": avatar_id}, {"$set": update_data})
        avatar.update(update_data)
    
    return AvatarResponse(**avatar)

@router.delete("/{avatar_id}", status_code=204)
async def delete_avatar(avatar_id: str, authorization: str = Header(default="")):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)
    
    result = await db.ai_avatars.delete_one({"_id": avatar_id, "user_id": str(user["_id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Avatar not found")
    
    return None
