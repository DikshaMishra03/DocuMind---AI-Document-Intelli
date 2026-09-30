import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Chat(Base):
    __tablename__ = "chats"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), default="New Chat")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    messages = relationship(
        "Message",
        back_populates="chat",
        cascade="all, delete-orphan",
        order_by="Message.created_at"
    )

    def __repr__(self):
        return f"<Chat id={self.id} title={self.title}>"
