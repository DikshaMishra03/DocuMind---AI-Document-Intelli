import re
from pathlib import Path
from pypdf import PdfReader
from fastapi import HTTPException, status

class PDFProcessingError(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

class PDFProcessor:
    """
    Service for extracting and cleaning text page-by-page from PDF files using PyPDF.
    """

    @staticmethod
    def clean_text(text: str) -> str:
        """
        Cleans raw extracted text:
        - Normalizes unicode spaces and line breaks
        - Removes non-printable control characters
        - Collapses excessive whitespace and empty lines
        """
        if not text:
            return ""
        
        # Replace non-breaking spaces and tabs with standard space
        text = text.replace("\xa0", " ").replace("\t", " ")
        # Strip control characters except newline
        text = re.sub(r"[\x00-\x09\x0b-\x1f\x7f-\x9f]", "", text)
        # Normalize multiple spaces per line
        text = re.sub(r"[ ]{2,}", " ", text)
        # Normalize excessive newlines (more than 2 newlines into 2)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @classmethod
    def extract_text(cls, file_path: str | Path) -> tuple[list[dict], int]:
        """
        Extracts cleaned text page-by-page from a PDF document.

        Returns:
            tuple of (pages_data, total_page_count)
            pages_data format: [{"page_number": 1, "text": "...", "char_count": 120}, ...]
        """
        path = Path(file_path)
        if not path.exists():
            raise PDFProcessingError(f"PDF file not found at: {file_path}")

        try:
            reader = PdfReader(str(path))
        except Exception as e:
            raise PDFProcessingError(f"Corrupted or invalid PDF file: {str(e)}")

        page_count = len(reader.pages)
        if page_count == 0:
            raise PDFProcessingError("The uploaded PDF has 0 pages and cannot be processed.")

        extracted_pages = []
        total_text_length = 0

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            try:
                raw_text = page.extract_text() or ""
                cleaned = cls.clean_text(raw_text)
            except Exception as e:
                cleaned = ""

            extracted_pages.append({
                "page_number": page_num,
                "text": cleaned,
                "char_count": len(cleaned)
            })
            total_text_length += len(cleaned)

        # Validate that the PDF contains extractable text
        if total_text_length == 0:
            raise PDFProcessingError(
                "The PDF contains no extractable text. It may be scanned, image-only, or empty."
            )

        return extracted_pages, page_count
