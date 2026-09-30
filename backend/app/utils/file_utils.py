import os
import re
from pathlib import Path
from fastapi import HTTPException, UploadFile, status
from backend.app.config import settings

def sanitize_filename(filename: str) -> str:
    """
    Sanitizes a filename to prevent path traversal and unsafe characters.
    """
    # Extract only the base name (no path components)
    clean_name = os.path.basename(filename).strip()
    # Replace any characters not alphanumeric, dash, dot, or underscore
    clean_name = re.sub(r"[^\w\s\.-]", "_", clean_name)
    # Remove leading dots or dashes
    clean_name = clean_name.lstrip(".-")
    if not clean_name:
        clean_name = "uploaded_document.pdf"
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"
    return clean_name

def validate_pdf_file(file: UploadFile) -> None:
    """
    Validates uploaded file MIME type and extension.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )
    
    ext = Path(file.filename).suffix.lower()
    if ext != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type '{ext}'. Only PDF documents (.pdf) are supported."
        )

    # Check content type if provided
    if file.content_type and file.content_type not in ["application/pdf", "application/x-pdf", "application/octet-stream"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME type '{file.content_type}'. Expected 'application/pdf'."
        )
