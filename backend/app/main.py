import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routes.health import router as health_router
from backend.app.routes.documents import router as documents_router
from backend.app.routes.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("documind")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database schema
    logger.info("Initializing DocuMind database schema...")
    init_db()
    logger.info(f"DocuMind API started successfully. Gemini Model: {settings.GEMINI_MODEL}")
    yield
    logger.info("DocuMind API shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Full-Stack Retrieval-Augmented Generation (RAG) Document Intelligence API with FAISS and Google Gemini",
    lifespan=lifespan
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers for clear error responses without leaking internal stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please verify your input or check server configuration."}
    )

# Register route modules
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(chat_router)

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
