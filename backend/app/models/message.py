import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    chat_id = Column(String(36), ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    chat = relationship("Chat", back_populates="messages")
    sources = relationship(
        "Source",
        back_populates="message",
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Message id={self.id} role={self.role}>"


class Source(Base):
    __tablename__ = "sources"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String(36), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    document_name = Column(String(255), nullable=False)
    page_number = Column(Integer, nullable=False)
    chunk_id = Column(String(64), nullable=False)
    chunk_snippet = Column(Text, nullable=True)
    score = Column(Float, nullable=True)

    # Relationship
    message = relationship("Message", back_populates="sources")

    def __repr__(self):
        return f"<Source id={self.id} doc={self.document_name} p={self.page_number}>"
