import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.chat import Chat
from backend.app.models.message import Message, Source
from backend.app.schemas.chat import ChatCreate, ChatResponse, ChatListResponse
from backend.app.schemas.message import (
    ChatQueryRequest,
    ChatQueryResponse,
    MessageResponse,
    SourceResponse
)
from backend.app.services.rag_pipeline import RAGPipeline

router = APIRouter(prefix="/api", tags=["Chat"])

@router.post("/chat", response_model=ChatQueryResponse)
def query_rag(
    request: ChatQueryRequest,
    db: Session = Depends(get_db)
):
    """
    Submits a user question to the RAG pipeline.
    Retrieves semantic chunks from FAISS, queries Google Gemini,
    persists chat history and source provenance to the database.
    """
    clean_question = request.question.strip()
    if not clean_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    # 1. Resolve or create chat conversation
    chat_record = None
    if request.chat_id:
        chat_record = db.query(Chat).filter(Chat.id == request.chat_id).first()
        if not chat_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chat session '{request.chat_id}' not found."
            )
    else:
        # Generate initial title from first 40 chars of question
        title_preview = (clean_question[:37] + "...") if len(clean_question) > 40 else clean_question
        chat_record = Chat(id=str(uuid.uuid4()), title=title_preview)
        db.add(chat_record)
        db.commit()
        db.refresh(chat_record)

    # 2. Save user message to database
    user_msg = Message(
        id=str(uuid.uuid4()),
        chat_id=chat_record.id,
        role="user",
        content=clean_question
    )
    db.add(user_msg)
    db.commit()

    # 3. Execute RAG pipeline
    pipeline = RAGPipeline()
    try:
        rag_result = pipeline.answer_question(
            question=clean_question,
            top_k=request.top_k
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}"
        )

    answer_text = rag_result["answer"]
    raw_sources = rag_result.get("sources", [])

    # 4. Save assistant response to database
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        chat_id=chat_record.id,
        role="assistant",
        content=answer_text
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    # 5. Save source provenance records
    saved_sources = []
    for src in raw_sources:
        source_record = Source(
            id=str(uuid.uuid4()),
            message_id=assistant_msg.id,
            document_id=src.get("document_id"),
            document_name=src.get("document_name", "Unknown Document"),
            page_number=src.get("page_number", 1),
            chunk_id=src.get("chunk_id", ""),
            chunk_snippet=src.get("chunk_snippet"),
            score=src.get("score")
        )
        db.add(source_record)
        saved_sources.append(source_record)

    db.commit()

    # Format source responses
    source_responses = [
        SourceResponse.model_validate(s) for s in saved_sources
    ]

    return ChatQueryResponse(
        chat_id=chat_record.id,
        question=clean_question,
        answer=answer_text,
        sources=source_responses,
        retrieved_count=rag_result.get("retrieved_count", 0),
        model_used=rag_result.get("model_used", settings.GEMINI_MODEL)
    )

@router.get("/chats", response_model=list[ChatListResponse])
def list_chats(db: Session = Depends(get_db)):
    """
    Lists past chat conversations ordered by most recent.
    """
    chats = db.query(Chat).order_by(Chat.created_at.desc()).all()
    results = []
    for c in chats:
        results.append(ChatListResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            message_count=len(c.messages)
        ))
    return results

@router.get("/chats/{chat_id}", response_model=ChatResponse)
def get_chat(chat_id: str, db: Session = Depends(get_db)):
    """
    Retrieves full chat conversation with message history and sources.
    """
    chat_record = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )

    # Prepare message responses with sources
    formatted_messages = []
    for msg in chat_record.messages:
        sources_list = [SourceResponse.model_validate(s) for s in msg.sources]
        formatted_messages.append(MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
            sources=sources_list
        ))

    return ChatResponse(
        id=chat_record.id,
        title=chat_record.title,
        created_at=chat_record.created_at,
        messages=formatted_messages
    )

@router.delete("/chats/{chat_id}", status_code=status.HTTP_200_OK)
def delete_chat(chat_id: str, db: Session = Depends(get_db)):
    """
    Deletes a chat conversation and all related messages and sources.
    """
    chat_record = db.query(Chat).filter(Chat.id == chat_id).first()
    if not chat_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{chat_id}' not found."
        )

    db.delete(chat_record)
    db.commit()
    return {"message": "Chat conversation deleted successfully.", "deleted_id": chat_id}
