from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class SourceResponse(BaseModel):
    id: str
    document_id: str | None = None
    document_name: str
    page_number: int
    chunk_id: str
    chunk_snippet: str | None = None
    score: float | None = None

    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1)

class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    created_at: datetime
    sources: list[SourceResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ChatQueryRequest(BaseModel):
    chat_id: str | None = None
    question: str = Field(..., min_length=1, description="User question for RAG pipeline")
    top_k: int | None = Field(default=None, ge=1, le=20)

class ChatQueryResponse(BaseModel):
    chat_id: str
    question: str
    answer: str
    sources: list[SourceResponse]
    retrieved_count: int
    model_used: str
