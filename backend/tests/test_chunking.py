import pytest
from backend.app.services.text_chunker import TextChunker

def test_chunking_small_text():
    """Text smaller than chunk size should result in 1 chunk."""
    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    pages = [{"page_number": 1, "text": "This is a brief text document."}]
    chunks = chunker.chunk_document("doc-1", "test.pdf", pages)

    assert len(chunks) == 1
    assert chunks[0]["document_id"] == "doc-1"
    assert chunks[0]["page_number"] == 1
    assert chunks[0]["chunk_text"] == "This is a brief text document."

def test_chunking_multiple_pages():
    """Validates that page numbers are preserved across chunks."""
    chunker = TextChunker(chunk_size=50, chunk_overlap=10)
    pages = [
        {"page_number": 1, "text": "Page one content with sufficient length to be split properly."},
        {"page_number": 2, "text": "Page two content that also has separate paragraphs and words."}
    ]
    chunks = chunker.chunk_document("doc-2", "multipage.pdf", pages)

    assert len(chunks) >= 2
    page_numbers = {c["page_number"] for c in chunks}
    assert 1 in page_numbers
    assert 2 in page_numbers

def test_chunk_overlap_validation():
    """Overlap greater than or equal to chunk_size should raise ValueError."""
    with pytest.raises(ValueError):
        TextChunker(chunk_size=100, chunk_overlap=100)

    with pytest.raises(ValueError):
        TextChunker(chunk_size=100, chunk_overlap=150)

def test_empty_pages_chunking():
    """Empty pages should yield no chunks."""
    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    pages = [{"page_number": 1, "text": "   "}, {"page_number": 2, "text": ""}]
    chunks = chunker.chunk_document("doc-3", "empty.pdf", pages)
    assert len(chunks) == 0
