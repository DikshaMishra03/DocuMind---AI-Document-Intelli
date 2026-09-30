import uuid
from backend.app.config import settings

class TextChunker:
    """
    Splits page-extracted text into semantic chunks with configurable size and overlap.
    Preserves page numbers and metadata for accurate RAG source citation.
    """

    def __init__(self, chunk_size: int | None = None, chunk_overlap: int | None = None):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")

    def _split_text(self, text: str) -> list[str]:
        """
        Splits text into chunks respecting word boundaries, sentence boundaries,
        chunk_size, and chunk_overlap.
        """
        if not text or not text.strip():
            return []

        text = text.strip()
        if len(text) <= self.chunk_size:
            return [text]

        chunks = []
        start = 0
        text_len = len(text)

        while start < text_len:
            end = start + self.chunk_size

            if end >= text_len:
                chunk = text[start:].strip()
                if chunk:
                    chunks.append(chunk)
                break

            # Try to find a natural break point (paragraph break, sentence end, newline, or space)
            segment = text[start:end]
            break_point = -1

            # Check preferred delimiters in order
            delimiters = ["\n\n", "\n", ". ", "? ", "! ", "; ", " "]
            for delim in delimiters:
                pos = segment.rfind(delim)
                # Ensure the break point is reasonably deep in the chunk (at least 40% in)
                if pos != -1 and pos >= int(self.chunk_size * 0.4):
                    break_point = pos + len(delim)
                    break

            if break_point == -1:
                # Fallback: break at the end of the window
                break_point = self.chunk_size

            chunk = text[start : start + break_point].strip()
            if chunk:
                chunks.append(chunk)

            # Advance by step size (chunk length minus overlap)
            step = max(1, break_point - self.chunk_overlap)
            start += step

        return chunks

    def chunk_document(
        self,
        document_id: str,
        document_name: str,
        pages: list[dict]
    ) -> list[dict]:
        """
        Chunks all pages of a document and attaches complete metadata to each chunk.

        Args:
            document_id: Unique document identifier
            document_name: Original file name
            pages: List of {"page_number": int, "text": str}

        Returns:
            List of chunk dicts:
            [
                {
                    "chunk_id": str,
                    "document_id": str,
                    "document_name": str,
                    "page_number": int,
                    "chunk_text": str,
                    "chunk_index": int
                }, ...
            ]
        """
        all_chunks = []
        chunk_counter = 0

        for page in pages:
            page_number = page.get("page_number", 1)
            raw_text = page.get("text", "")
            if not raw_text.strip():
                continue

            page_chunks = self._split_text(raw_text)

            for chunk_str in page_chunks:
                chunk_counter += 1
                chunk_id = f"{document_id}_p{page_number}_c{chunk_counter}"
                all_chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "document_name": document_name,
                    "page_number": page_number,
                    "chunk_text": chunk_str,
                    "chunk_index": chunk_counter
                })

        return all_chunks
