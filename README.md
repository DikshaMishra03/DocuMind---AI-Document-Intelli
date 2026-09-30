# DocuMind — AI-Powered Document Intelligence & RAG Assistant

[![Python Version](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![FAISS](https://img.shields.io/badge/Vector_DB-FAISS-0081CB.svg)](https://github.com/facebookresearch/faiss)
[![LLM](https://img.shields.io/badge/LLM-Google_Gemini-8E75C4.svg)](https://ai.google.dev/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

DocuMind is an enterprise-grade, full-stack **Retrieval-Augmented Generation (RAG)** application designed to ingest single or multi-file PDF documents, preprocess and chunk text, compute high-dimensional dense vector embeddings with Transformer models, perform sub-millisecond semantic search via a FAISS vector index, and synthesize factually grounded, hallucination-free answers with **Google Gemini**.

Every generated answer is accompanied by strict provenance citations: identifying the exact document name, page number, and chunk relevance score.

---

## Table of Contents

- [DocuMind — AI-Powered Document Intelligence \& RAG Assistant](#documind--ai-powered-document-intelligence--rag-assistant)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Problem Statement](#problem-statement)
  - [Key Features](#key-features)
  - [Tech Stack](#tech-stack)
  - [System Architecture](#system-architecture)
  - [How RAG Works in DocuMind](#how-rag-works-in-documind)
  - [Project Directory Structure](#project-directory-structure)
  - [Prerequisites](#prerequisites)
  - [Environment Variables Configuration](#environment-variables-configuration)
  - [PostgreSQL Database Setup](#postgresql-database-setup)
  - [Backend Setup (FastAPI)](#backend-setup-fastapi)
  - [Frontend Setup (React + Vite)](#frontend-setup-react--vite)
  - [Running with Docker Compose](#running-with-docker-compose)
  - [REST API Endpoints](#rest-api-endpoints)
  - [Testing \& Verification](#testing--verification)
  - [Security Best Practices](#security-best-practices)
  - [Limitations \& Edge Cases](#limitations--edge-cases)
  - [Future Roadmap](#future-roadmap)
  - [UI Screenshots](#ui-screenshots)
  - [Generative AI Interview Guide (14 Essential Concepts)](#generative-ai-interview-guide-14-essential-concepts)

---

## Overview

Modern enterprises produce vast amounts of unstructured knowledge stored in PDF format—research papers, financial filings, technical documentation, and compliance guidelines. General-purpose Large Language Models (LLMs) cannot reliably answer questions about private documents because:
1. They lack access to internal proprietary knowledge.
2. They suffer from hallucinations when reasoning beyond their pre-training window.
3. They cannot cite verifiable page-level evidence.

**DocuMind** resolves these challenges by coupling a production-grade Python FastAPI backend, PyPDF parsing, Sentence-Transformers (`all-MiniLM-L6-v2`), FAISS vector similarity indexing, and PostgreSQL with a modern React SPA.

---

## Problem Statement

Standard keyword search (Ctrl+F or BM25) fails when users ask questions using different vocabulary than the document's original wording (e.g., asking *"What is the company's financial liquidity?"* when the document mentions *"cash flow and short-term assets"*). 

Conversely, feeding entire hundred-page PDFs directly into an LLM context window causes high latency, token expenditure, and context-stuffing degradation.

DocuMind implements semantic chunking and dense vector retrieval to fetch only the top-K most semantically relevant text passages, feeding them to Google Gemini with a zero-hallucination prompt constraint.

---

## Key Features

- **Multi-Document PDF Ingestion**: Upload single or multiple PDF documents with automatic validation of MIME type, header magic bytes, and file size limits (25MB).
- **Page-Preserving Text Processing**: PyPDF extracts text page-by-page, cleans Unicode whitespaces and unprintable control characters, and attaches page number metadata.
- **Semantic Text Chunking**: Splits content into configurable 1000-character windows with 200-character overlap along sentence and paragraph boundaries to eliminate mid-thought truncations.
- **Local Dense Embeddings**: Runs `sentence-transformers/all-MiniLM-L6-v2` locally to produce 384-dimensional normalized vector embeddings.
- **FAISS Vector Index**: Flat Inner-Product (`IndexFlatIP`) vector index for cosine similarity queries, with disk persistence and automatic index compaction upon document deletion.
- **Strict Grounding with Google Gemini**: Prompt engineering enforces strict factual grounding—prohibiting speculation and returning *"I couldn't find this information in the uploaded documents"* whenever context is insufficient.
- **Page-Level Provenance & Citations**: Every answer displays document names, page numbers, similarity scores, and expandable source text snippets.
- **Persistent Chat History**: Relational SQLAlchemy storage (PostgreSQL/SQLite) tracking chats, user messages, assistant responses, and relational source citations.
- **Modern React Interface**: Clean typography, upload progress states, multi-stage loading indicators (*"Searching documents..."* → *"Generating answer..."*), and responsive 3-column layout.

---

## Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.11+) | Asynchronous REST API with automatic OpenAPI/Swagger documentation |
| **ASGI Server** | Uvicorn | High-performance ASGI production web server |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` | 384-dimensional Transformer embeddings running locally |
| **Vector Search** | FAISS (`faiss-cpu`) | High-throughput sub-millisecond nearest neighbor search |
| **Generative LLM** | Google Gemini (`gemini-3.8-flash`) | Grounded answer generation using `@google/genai` SDK |
| **PDF Extraction** | PyPDF 5.x | Native page-by-page text parsing and cleaning |
| **Relational Database**| PostgreSQL 16 / SQLAlchemy 2.x | ACID persistence for documents, chats, messages, and citations |
| **Data Validation** | Pydantic v2 / Settings | Strict request/response schema serialization |
| **Testing** | pytest + TestClient | Automated test suite for chunking, PDF parsing, and APIs |
| **Frontend** | React 19 + TypeScript + Vite | Reactive, modular component architecture |
| **HTTP Client** | Axios | Configured API client with progress tracking and interceptors |
| **Styling** | Tailwind CSS v4 | Clean, modern AI SaaS interface with custom dark aesthetic |
| **Containerization**| Docker & Docker Compose | Multi-container PostgreSQL and backend deployment |

---

## System Architecture

```
                                  DOCUMIND ARCHITECTURE
                                  
   +-------------------------------------------------------------------------+
   |                             USER BROWSER                                |
   |               React 19 SPA + Vite + Tailwind CSS + Axios                |
   +------------------------------------+------------------------------------+
                                        | HTTP / JSON (REST)
                                        v
   +-------------------------------------------------------------------------+
   |                        FASTAPI BACKEND (Port 8000)                      |
   |                                                                         |
   |  [/api/documents/upload]    [/api/chat]        [/api/health]            |
   |           |                      |                    |                 |
   |           v                      v                    v                 |
   |   +---------------+      +---------------+    +-------------------+     |
   |   | PDF Processor |      |  RAG Pipeline |    | System Diagnostics|     |
   |   | (PyPDF 5.x)   |      +-------+-------+    +-------------------+     |
   |   +-------+-------+              |                                      |
   |           v                      v                                      |
   |   +---------------+      +---------------+                              |
   |   | Text Chunker  |      | Embeddings Svc|                              |
   |   | (1000ch/200ov)|      | (all-MiniLM)  |                              |
   |   +-------+-------+      +-------+-------+                              |
   |           |                      |                                      |
   +-----------|----------------------|--------------------------------------+
               |                      |
               v                      v
   +-----------------------+  +----------------------------------------------+
   |  POSTGRESQL DATABASE  |  |              FAISS VECTOR STORE              |
   |  - documents          |  |  - faiss.index (384-dim IndexFlatIP)         |
   |  - chats              |  |  - chunks_metadata.json (doc_id, page, text) |
   |  - messages           |  +-----------------------+----------------------+
   |  - sources            |                          | Top-K Chunks
   +-----------------------+                          v
                                      +--------------------------------------+
                                      |          GOOGLE GEMINI API           |
                                      |      Model: gemini-3.8-flash         |
                                      |      Strict zero-hallucination prompt|
                                      +--------------------------------------+
```

---

## How RAG Works in DocuMind

1. **Document Ingestion**: The user uploads a PDF. File size, extension, and headers are validated.
2. **Text Extraction**: PyPDF parses the binary stream into raw page strings while maintaining 1-indexed page metadata.
3. **Text Cleaning**: Whitespaces, unprintable ASCII control codes, and duplicate line breaks are stripped and normalized.
4. **Semantic Chunking**: Text is split into 1000-character segments with 200-character overlap. Chunk cuts prioritize natural paragraph and sentence endings (`\n\n`, `\n`, `. `, `? `, `! `).
5. **Dense Vector Embedding**: Each chunk text is passed through the `all-MiniLM-L6-v2` transformer model to produce a 384-dimensional L2-normalized float vector.
6. **FAISS Indexing**: Vectors are inserted into FAISS (`IndexFlatIP`), with an aligned metadata mapping storing `document_id`, `document_name`, `page_number`, and `chunk_text`.
7. **Query Embedding**: When the user enters a question, the query string is embedded into the same 384-dimensional vector space.
8. **Similarity Search**: FAISS computes the inner product between the query vector and all chunk vectors, returning the top-K highest similarity candidates.
9. **Context Assembly**: Retrieved chunks are arranged into a structured context block with explicit source indices and page numbers.
10. **Grounded Generation**: Google Gemini processes the prompt under strict system instructions: answer factually using *only* the context, or state clearly if the answer is not present.
11. **Provenance Return**: The answer is returned with structured citations, and the entire conversation turn is saved to the database.

---

## Project Directory Structure

```
DocuMind/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app, CORS, lifespan, exception handlers
│   │   ├── config.py            # Pydantic BaseSettings, env vars, defaults
│   │   ├── database.py          # SQLAlchemy engine, session maker, get_db dependency
│   │   │
│   │   ├── models/              # SQLAlchemy Database Models
│   │   │   ├── __init__.py
│   │   │   ├── document.py      # Document model (filename, pages, status)
│   │   │   ├── chat.py          # Chat session model
│   │   │   └── message.py       # Message and Source citation models
│   │   │
│   │   ├── schemas/             # Pydantic v2 Serialization Schemas
│   │   │   ├── __init__.py
│   │   │   ├── document.py      # DocumentResponse, DocumentUploadResponse
│   │   │   ├── chat.py          # ChatResponse, ChatListResponse
│   │   │   └── message.py       # MessageResponse, SourceResponse, ChatQueryRequest
│   │   │
│   │   ├── routes/              # FastAPI Router Modules
│   │   │   ├── __init__.py
│   │   │   ├── health.py        # GET /api/health
│   │   │   ├── documents.py     # POST, GET, DELETE /api/documents
│   │   │   └── chat.py          # POST /api/chat, GET/DELETE /api/chats
│   │   │
│   │   ├── services/            # Core RAG Services
│   │   │   ├── __init__.py
│   │   │   ├── pdf_processor.py # PyPDF page extraction & whitespace normalization
│   │   │   ├── text_chunker.py  # Recursive boundary chunking with overlap
│   │   │   ├── embeddings.py    # SentenceTransformers embedding service
│   │   │   ├── vector_store.py  # FAISS IndexFlatIP management & persistence
│   │   │   ├── llm_service.py   # Google Gemini API integration & prompt building
│   │   │   └── rag_pipeline.py  # RAG retrieval, context formatting & synthesis
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── file_utils.py    # Filename sanitization & PDF format validation
│   │
│   ├── tests/                   # Pytest Test Suite
│   │   ├── __init__.py
│   │   ├── conftest.py          # SQLite in-memory fixtures & TestClient setup
│   │   ├── test_health.py       # Health and root endpoint verification
│   │   ├── test_chunking.py     # Chunk size, overlap, and boundary tests
│   │   └── test_pdf_processing.py # Empty PDF and text cleaning tests
│   │
│   ├── requirements.txt         # Production Python dependencies
│   ├── .env.example             # Backend environment template
│   └── Dockerfile               # Backend container image build
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Header with stats and view toggles
│   │   │   ├── DocumentSidebar.tsx    # Drag-and-drop PDF uploader & list
│   │   │   ├── ChatArea.tsx           # Messages, loading states, source drawer
│   │   │   ├── ChatInput.tsx          # Auto-resizing input with Top-K config
│   │   │   ├── ChatHistorySidebar.tsx # Conversation history list
│   │   │   └── ArchitectureModal.tsx  # Interactive RAG pipeline & interview guide
│   │   │
│   │   ├── services/
│   │   │   └── api.ts                 # Axios client with error handling
│   │   │
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript interfaces
│   │   ├── App.tsx                    # Root UI state & layout orchestrator
│   │   ├── main.tsx                   # React 19 mount point
│   │   └── index.css                  # Tailwind CSS imports
│   │
│   ├── package.json             # Frontend dependencies & build scripts
│   └── .env.example             # Frontend environment template
│
├── data/                        # Persistent Storage Directory
│   ├── uploads/                 # Saved PDF documents (.gitkeep)
│   └── vector_store/            # FAISS index and chunk metadata (.gitkeep)
│
├── docker-compose.yml           # PostgreSQL and multi-service setup
├── server.ts                    # Full-stack Node/Express runner on port 3000
├── README.md                    # Comprehensive documentation
└── .gitignore                   # GitHub exclusion rules
```

---

## Prerequisites

- **Python**: Version 3.11 or higher
- **Node.js**: Version 18 or 20+
- **Docker**: (Optional) for PostgreSQL and containerized execution
- **Google Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/)

---

## Environment Variables Configuration

### 1. Backend (`backend/.env`)

Copy the example file:
```bash
cp backend/.env.example backend/.env
```

Configure your variables:
```ini
# Google Gemini API Key (Server-side only)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# PostgreSQL Database URL
# For local Docker PostgreSQL:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/documind
# Or fallback to SQLite for local development without Docker:
# DATABASE_URL=sqlite:///./data/documind.db

# RAG & Chunking Parameters
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
TOP_K=5
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
MAX_FILE_SIZE_MB=25
```

### 2. Frontend (`frontend/.env`)

```ini
# Leave empty for relative proxying in dev, or specify backend URL
VITE_API_BASE_URL=http://localhost:8000
```

---

## PostgreSQL Database Setup

### Option A: Using Docker (Recommended)

Start PostgreSQL with Docker Compose:
```bash
docker compose up postgres -d
```
This spins up PostgreSQL on port `5432` with username `postgres`, password `postgres`, and database `documind`.

### Option B: Local PostgreSQL Installation

If using a native PostgreSQL install, create the database:
```sql
CREATE USER postgres WITH PASSWORD 'postgres';
CREATE DATABASE documind OWNER postgres;
```

*Note*: If PostgreSQL is not running, DocuMind automatically falls back to SQLite (`sqlite:///./data/documind.db`), allowing zero-friction offline development!

---

## Backend Setup (FastAPI)

1. Create and activate a Python virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r backend/requirements.txt
```

3. Run the FastAPI development server:
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive Swagger documentation is available at:
👉 **`http://localhost:8000/docs`**

---

## Frontend Setup (React + Vite)

1. Install Node dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The application will be live at:
👉 **`http://localhost:3000`**

---

## Running with Docker Compose

To run the entire full-stack application (PostgreSQL + FastAPI backend):
```bash
# 1. Provide your Gemini API key
export GEMINI_API_KEY=your_key_here

# 2. Build and start containers
docker compose up --build -d

# 3. Check logs
docker compose logs -f
```

---

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check, database status, FAISS stats |
| `POST` | `/api/documents/upload` | Upload PDF, extract text, chunk, embed, and index in FAISS |
| `GET` | `/api/documents` | List all uploaded documents with status and page count |
| `GET` | `/api/documents/{id}` | Retrieve specific document metadata |
| `DELETE`| `/api/documents/{id}` | Delete document, purge chunks, and rebuild FAISS index |
| `POST` | `/api/chat` | Submit question to RAG pipeline, retrieve context, query Gemini |
| `GET` | `/api/chats` | List past conversation sessions |
| `GET` | `/api/chats/{id}` | Retrieve chat session with message history and sources |
| `DELETE`| `/api/chats/{id}` | Delete a conversation session |

---

## Testing & Verification

Run the automated test suite with pytest:
```bash
pytest backend/tests -v
```

The test suite validates:
1. `/api/health` and root API endpoints.
2. Text chunking correctness with variable sizes and overlap validation.
3. Multi-page document page-number preservation across chunks.
4. PyPDF text cleaning, whitespace normalization, and unprintable character removal.
5. Graceful rejection of empty PDFs (0 pages) and PDFs with no extractable text.

---

## Security Best Practices

- **Zero Client-Side Secret Exposure**: `GEMINI_API_KEY` is loaded only on the server through environment variables. The client never sees or requests API keys.
- **Path Traversal Protection**: Uploaded filenames are sanitized with `re.sub(r"[^\w\s\.-]", "_", clean_name)` and stripped of directory traversal sequences (`../`).
- **File Validation & Size Capping**: File uploads are strictly restricted to `.pdf` with an enforced 25MB buffer streaming threshold.
- **Safe Execution**: Uploaded files are strictly treated as binary data for text extraction; no file execution is permitted.
- **Error Sanitization**: Database and internal server errors return generic messages to client consumers while preserving detailed trace logs on the server.

---

## Limitations & Edge Cases

1. **Scanned Images**: PDFs containing scanned images without embedded text layers require an OCR pre-processor (such as Tesseract or Google Cloud Vision).
2. **Tabular Data**: Complex multi-column financial tables can lose spatial column alignments during raw linear text extraction.
3. **Model Context Limits**: Extremely broad queries asking to summarize 500 pages in one shot are limited by the Top-K retrieval window.

---

## Future Roadmap

- [ ] Hybrid Search (combining BM25 keyword matching with dense FAISS vectors)
- [ ] OCR integration via Tesseract for scanned document support
- [ ] Multi-query expansion and HyDE (Hypothetical Document Embeddings)
- [ ] Cross-encoder re-ranking (e.g. `bge-reranker-large`) for higher retrieval precision
- [ ] User authentication with JWT and multi-tenant document isolation

---

## UI Screenshots

*Note: Replace placeholders with actual application captures.*

| Upload & Document Management | Interactive RAG Chat & Provenance |
| :---: | :---: |
| ![Document Management](https://via.placeholder.com/600x350/0f172a/ffffff?text=DocuMind+Document+Upload+Sidebar) | ![RAG Chat](https://via.placeholder.com/600x350/0f172a/ffffff?text=DocuMind+Chat+Area+with+Sources) |

---

## Generative AI Interview Guide (14 Essential Concepts)

### 1. What is RAG (Retrieval-Augmented Generation)?
RAG is an AI framework that augments an LLM's prompt with dynamically retrieved, authoritative information from an external vector knowledge store before generation. It enables the model to cite verified facts and answer domain-specific questions without costly model fine-tuning.

### 2. What are embeddings?
Embeddings are learned dense vector representations of textual concepts in a continuous multi-dimensional space (e.g., 384 dimensions). Text segments with similar semantic meaning are mapped close together according to cosine distance or inner products.

### 3. What is a Transformer?
The Transformer (Vaswani et al., 2017) is a neural architecture utilizing multi-head self-attention mechanisms to process tokens in parallel. Unlike legacy RNNs or LSTMs, Transformers dynamically weigh the relevance of every word in a sequence relative to all other words, capturing long-range dependencies.

### 4. What is semantic search?
Semantic search retrieves documents based on the conceptual meaning of a query rather than lexical keyword matches. It maps both query and documents into an embedding space to find the closest semantic neighbors.

### 5. What is FAISS?
FAISS (Facebook AI Similarity Search) is an open-source C++ and Python library optimized for fast similarity search and clustering of dense vectors. It supports exact flat searches (`IndexFlatIP`, `IndexFlatL2`) and approximate nearest neighbor (ANN) techniques (`IVF`, `HNSW`, `PQ`).

### 6. Why use a vector database instead of a relational database for search?
Relational databases index scalar values (B-Trees) along 1 dimension and cannot compute nearest neighbors across 384+ dimensions. Vector databases use specialized multi-dimensional indexing (graph-based HNSW or inverted file clusters) to search millions of vectors in sub-linear time ($O(\log N)$).

### 7. Why do we chunk documents?
LLMs have finite context token windows and incur higher latency and costs as context grows. Chunking segments large documents into coherent semantic passages (typically 500–1000 characters), enabling targeted retrieval of only the relevant passages.

### 8. What is chunk overlap?
Chunk overlap preserves context at the boundaries between consecutive text chunks. If a key fact, sentence, or definition spans a chunk boundary, overlap prevents the concept from being truncated or lost during retrieval.

### 9. What is Top-K retrieval?
Top-K defines the number of highest-scoring relevant chunks retrieved from the vector index for a user's query. Typical values range from 3 to 8 chunks.

### 10. What is hallucination?
Hallucination is when an LLM generates factually false or nonsensical statements with high confidence. Because LLMs predict tokens based on statistical probabilities rather than verifiable truth, they can fabricate information when lacking context.

### 11. How does RAG reduce hallucinations?
RAG grounds the LLM by explicitly injecting retrieved source facts into the prompt and instructing the model: *"Answer the question using only the provided context. If the answer cannot be found, state that the information is not available."*

### 12. Why use modular RAG services?
Modular design separates concerns: PDF ingestion, text chunking, embedding generation, vector indexing, and prompt synthesis are decoupled. This makes it trivial to swap embedding models, change vector stores, or upgrade LLM providers without rewriting the core application.

### 13. SQL database vs. Vector database in DocuMind
- **PostgreSQL / SQLAlchemy**: Stores structured relational entities (documents, user accounts, chat sessions, message logs, and source foreign keys).
- **FAISS Vector Store**: Stores dense floating-point vector representations and performs vector dot-product similarity calculations.

### 14. Why API keys must remain private and server-side
Exposing LLM API keys in browser bundles allows unauthorized actors to extract credentials, exhaust API rate limits, run up financial costs, and bypass system safety guidelines. All LLM calls must remain server-side behind authenticated API routes.

---

## License

This project is licensed under the Apache 2.0 License.
