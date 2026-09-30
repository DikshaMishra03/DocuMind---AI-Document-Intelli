from backend.app.routes.health import router as health_router
from backend.app.routes.documents import router as documents_router
from backend.app.routes.chat import router as chat_router

__all__ = ["health_router", "documents_router", "chat_router"]
