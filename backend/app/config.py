import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "data"

class Settings(BaseSettings):
    APP_NAME: str = "DocuMind"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Gemini API Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    # Database Configuration (PostgreSQL default, SQLite fallback for local test/dev)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{DATA_DIR / 'documind.db'}"
    )

    # RAG / NLP Configuration
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))
    TOP_K: int = int(os.getenv("TOP_K", "5"))

    # File Upload & Storage Configuration
    UPLOAD_DIR: str = str(DATA_DIR / "uploads")
    VECTOR_STORE_DIR: str = str(DATA_DIR / "vector_store")
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
    ALLOWED_EXTENSIONS: list[str] = [".pdf"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure required runtime directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)
