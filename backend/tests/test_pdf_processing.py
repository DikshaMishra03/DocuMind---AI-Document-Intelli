import pytest
from pypdf import PdfWriter
from backend.app.services.pdf_processor import PDFProcessor, PDFProcessingError

def test_clean_text():
    raw = "Hello   world!\n\n\n\nThis has \xa0 tabs\tand spaces."
    cleaned = PDFProcessor.clean_text(raw)
    assert "\xa0" not in cleaned
    assert "\t" not in cleaned
    assert "\n\n\n" not in cleaned
    assert "Hello world!" in cleaned

def test_empty_pdf_handling(tmp_path):
    # Create empty PDF file with 0 pages
    empty_pdf_path = tmp_path / "empty.pdf"
    writer = PdfWriter()
    with open(empty_pdf_path, "wb") as f:
        writer.write(f)

    with pytest.raises(PDFProcessingError) as exc_info:
        PDFProcessor.extract_text(empty_pdf_path)
    assert "0 pages" in str(exc_info.value.detail)

def test_pdf_without_text_handling(tmp_path):
    # Create a 1-page blank PDF
    blank_pdf_path = tmp_path / "blank.pdf"
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    with open(blank_pdf_path, "wb") as f:
        writer.write(f)

    with pytest.raises(PDFProcessingError) as exc_info:
        PDFProcessor.extract_text(blank_pdf_path)
    assert "no extractable text" in str(exc_info.value.detail)
