from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class MongoBase(BaseModel):
    id: str | None = Field(default=None, alias="_id")
    model_config = ConfigDict(populate_by_name=True)


class MessageResponse(BaseModel):
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
