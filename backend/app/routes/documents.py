import os
import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.document import Document
from backend.app.schemas.document import DocumentResponse, DocumentUploadResponse
from backend.app.services.pdf_processor import PDFProcessor
from backend.app.services.text_chunker import TextChunker
from backend.app.services.vector_store import VectorStoreService
from backend.app.utils.file_utils import sanitize_filename, validate_pdf_file

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a PDF file, extracts and cleans text page-by-page, chunks the text,
    generates vector embeddings, and stores document metadata in database and FAISS index.
    """
    # 1. Validate file extension and MIME type
    validate_pdf_file(file)

    clean_filename = sanitize_filename(file.filename or "uploaded.pdf")
    doc_id = str(uuid.uuid4())
    stored_filename = f"{doc_id}_{clean_filename}"
    file_path = Path(settings.UPLOAD_DIR) / stored_filename

    # 2. Save file to disk while enforcing max file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    bytes_read = 0

    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                bytes_read += len(chunk)
                if bytes_read > max_bytes:
                    if file_path.exists():
                        file_path.unlink()
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded file: {str(e)}"
        )

    # 3. Create initial document record with 'processing' status
    doc_record = Document(
        id=doc_id,
        filename=clean_filename,
        file_path=str(file_path),
        file_size=bytes_read,
        page_count=0,
        status="processing"
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # 4. Process document: extract text, chunk, and embed
    try:
        # Extract page-by-page text
        pages_data, total_pages = PDFProcessor.extract_text(file_path)
        doc_record.page_count = total_pages

        # Split into semantic chunks
        chunker = TextChunker()
        chunks = chunker.chunk_document(
            document_id=doc_id,
            document_name=clean_filename,
            pages=pages_data
        )

        if not chunks:
            raise ValueError("No text chunks could be generated from document content.")

        # Embed and index in FAISS
        vector_store = VectorStoreService()
        vector_store.add_chunks(chunks)

        # Mark document as ready
        doc_record.status = "ready"
        doc_record.error_message = None
        db.commit()
        db.refresh(doc_record)

        return DocumentUploadResponse(
            message="Document uploaded, processed, and indexed successfully.",
            document=DocumentResponse.model_validate(doc_record),
            total_chunks=len(chunks)
        )

    except Exception as e:
        # On error, update document record and raise clean error
        doc_record.status = "error"
        doc_record.error_message = str(e)
        db.commit()

        # Remove local file if processing failed
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document processing failed: {str(e)}"
        )

@router.get("", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """
    Returns list of all uploaded documents with current processing status.
    """
    docs = db.query(Document).order_by(Document.upload_time.desc()).all()
    return [DocumentResponse.model_validate(d) for d in docs]

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """
    Retrieves metadata for a specific document by ID.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )
    return DocumentResponse.model_validate(doc)

@router.delete("/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """
    Deletes a document from the database, removes its chunks from the FAISS vector index,
    rebuilds the index to maintain integrity, and removes the file from disk.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found."
        )

    # 1. Remove associated chunks from FAISS vector store
    try:
        vs = VectorStoreService()
        vs.delete_document_chunks(document_id)
    except Exception as e:
        print(f"[Warning] Failed to delete chunks from vector store: {e}")

    # 2. Remove physical file from disk
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"[Warning] Could not remove physical file '{doc.file_path}': {e}")

    # 3. Delete database record
    db.delete(doc)
    db.commit()

    return {
        "message": f"Document '{doc.filename}' deleted successfully.",
        "deleted_id": document_id
    }
