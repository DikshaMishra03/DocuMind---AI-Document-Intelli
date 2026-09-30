import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text
from backend.app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    status = Column(String(50), default="processing")  # 'processing', 'ready', 'error'
    error_message = Column(Text, nullable=True)
    upload_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<Document id={self.id} filename={self.filename} status={self.status}>"
