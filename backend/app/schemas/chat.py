from datetime import datetime
from pydantic import BaseModel, ConfigDict
from backend.app.schemas.message import MessageResponse

class ChatCreate(BaseModel):
    title: str | None = None

class ChatResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    messages: list[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ChatListResponse(BaseModel):
    id: str
    title: str
    created_at: datetime
    message_count: int = 0

    model_config = ConfigDict(from_attributes=True)
