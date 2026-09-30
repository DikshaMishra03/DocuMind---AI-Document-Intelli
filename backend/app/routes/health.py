import os
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.services.vector_store import VectorStoreService

router = APIRouter(prefix="/api", tags=["Health"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    System health check returning database status, vector store statistics,
    and runtime environment readiness.
    """
    # Check Database
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    # Check Vector Store
    vector_stats = {}
    try:
        vs = VectorStoreService()
        vector_stats = vs.get_stats()
    except Exception as e:
        vector_stats = {"error": str(e)}

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_status,
        "database_type": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
        "vector_store": vector_stats,
        "gemini_api_configured": bool(settings.GEMINI_API_KEY),
        "embedding_model": settings.EMBEDDING_MODEL,
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "top_k": settings.TOP_K
    }
