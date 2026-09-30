from datetime import datetime
from pydantic import BaseModel, ConfigDict

class DocumentBase(BaseModel):
    filename: str
    page_count: int
    status: str
    error_message: str | None = None

class DocumentResponse(DocumentBase):
    id: str
    file_size: int
    upload_time: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentUploadResponse(BaseModel):
    message: str
    document: DocumentResponse
    total_chunks: int = 0
