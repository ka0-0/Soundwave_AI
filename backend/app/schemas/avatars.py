from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class AvatarGenerateRequest(BaseModel):
    mood: str
    style: str
    image_data: Optional[str] = None # Base64 encoded image or URL

class AvatarMetadata(BaseModel):
    mood: str
    style: str
    prompt: Optional[str] = None
    provider: str

class AvatarResponse(BaseModel):
    id: str
    image_url: str
    mood: str
    style: str
    name: Optional[str] = None
    created_at: datetime

class AvatarUpdate(BaseModel):
    name: Optional[str] = None
