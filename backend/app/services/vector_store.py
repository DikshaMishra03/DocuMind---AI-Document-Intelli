import json
import os
import threading
from pathlib import Path
import faiss
import numpy as np
from backend.app.config import settings
from backend.app.services.embeddings import EmbeddingService

class VectorStoreService:
    """
    FAISS Vector Store service managing vector embeddings and document chunk metadata.
    Provides persistence to disk, cosine similarity search, and index re-building upon document deletion.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(VectorStoreService, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.vector_dir = Path(settings.VECTOR_STORE_DIR)
        self.vector_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.vector_dir / "faiss.index"
        self.meta_path = self.vector_dir / "chunks_metadata.json"

        self.embedding_service = EmbeddingService()
        self.index = None
        self.chunks_metadata: list[dict] = []  # Index aligns 1:1 with FAISS vector IDs

        self._load_or_create()
        self._initialized = True

    def _load_or_create(self):
        """Loads FAISS index and metadata from disk, or initializes an empty one."""
        with self._lock:
            if self.index_path.exists() and self.meta_path.exists():
                try:
                    self.index = faiss.read_index(str(self.index_path))
                    with open(self.meta_path, "r", encoding="utf-8") as f:
                        self.chunks_metadata = json.load(f)
                    return
                except Exception as e:
                    # In case of corruption, re-initialize
                    print(f"[VectorStore] Warning: Could not load existing index: {e}. Reinitializing.")

            # Create an inner-product index (cosine similarity for normalized vectors)
            dim = self.embedding_service.dimension
            self.index = faiss.IndexFlatIP(dim)
            self.chunks_metadata = []
            self._save_to_disk_unlocked()

    def _save_to_disk_unlocked(self):
        """Persists FAISS index and metadata JSON to disk."""
        faiss.write_index(self.index, str(self.index_path))
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.chunks_metadata, f, ensure_ascii=False, indent=2)

    def save(self):
        """Thread-safe save to disk."""
        with self._lock:
            self._save_to_disk_unlocked()

    def add_chunks(self, chunks: list[dict]) -> int:
        """
        Generates embeddings for chunks and adds them to FAISS index and metadata.

        Args:
            chunks: List of dicts with chunk_id, document_id, document_name, page_number, chunk_text

        Returns:
            Number of chunks successfully added.
        """
        if not chunks:
            return 0

        texts = [c["chunk_text"] for c in chunks]
        embeddings = self.embedding_service.embed_documents(texts)

        with self._lock:
            self.index.add(embeddings)
            self.chunks_metadata.extend(chunks)
            self._save_to_disk_unlocked()

        return len(chunks)

    def search(self, query: str, top_k: int | None = None) -> list[dict]:
        """
        Performs semantic similarity search for a query against stored document chunks.

        Returns:
            List of matched chunk dicts enriched with 'score' (cosine similarity 0..1).
        """
        top_k = top_k or settings.TOP_K

        with self._lock:
            total_vectors = self.index.ntotal
            if total_vectors == 0:
                return []

            k = min(top_k, total_vectors)
            query_vector = self.embedding_service.embed_query(query)

            # Search FAISS index: D is similarities, I is vector indices
            distances, indices = self.index.search(query_vector, k)

            results = []
            for score, idx in zip(distances[0], indices[0]):
                if idx < 0 or idx >= len(self.chunks_metadata):
                    continue
                chunk_data = dict(self.chunks_metadata[idx])
                # Inner product of normalized vectors is cosine similarity [-1.0, 1.0]
                chunk_data["score"] = float(round(float(score), 4))
                results.append(chunk_data)

            return results

    def delete_document_chunks(self, document_id: str) -> int:
        """
        Removes all chunks associated with a document_id and rebuilds the FAISS index.

        Returns:
            Number of deleted chunks.
        """
        with self._lock:
            kept_chunks = [c for c in self.chunks_metadata if c.get("document_id") != document_id]
            deleted_count = len(self.chunks_metadata) - len(kept_chunks)

            if deleted_count == 0:
                return 0

            # Rebuild index with kept chunks
            dim = self.embedding_service.dimension
            new_index = faiss.IndexFlatIP(dim)

            if kept_chunks:
                texts = [c["chunk_text"] for c in kept_chunks]
                embeddings = self.embedding_service.embed_documents(texts)
                new_index.add(embeddings)

            self.index = new_index
            self.chunks_metadata = kept_chunks
            self._save_to_disk_unlocked()

            return deleted_count

    def get_stats(self) -> dict:
        """Returns statistics on the vector index."""
        with self._lock:
            return {
                "total_vectors": self.index.ntotal if self.index else 0,
                "total_metadata_chunks": len(self.chunks_metadata),
                "dimension": self.embedding_service.dimension,
                "index_path": str(self.index_path)
            }
