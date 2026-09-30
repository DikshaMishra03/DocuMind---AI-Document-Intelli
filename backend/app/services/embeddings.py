import numpy as np
from backend.app.config import settings

class EmbeddingService:
    """
    Embedding service using sentence-transformers (e.g. all-MiniLM-L6-v2).
    Generates normalized dense vector representations for document chunks and user queries.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingService, cls).__new__(cls)
        return cls._instance

    @property
    def model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            except Exception as e:
                raise RuntimeError(
                    f"Failed to load embedding model '{settings.EMBEDDING_MODEL}': {str(e)}. "
                    "Ensure 'sentence-transformers' and 'torch' are installed."
                )
        return self._model

    @property
    def dimension(self) -> int:
        """Returns the embedding vector dimension (384 for all-MiniLM-L6-v2)."""
        return self.model.get_sentence_embedding_dimension()

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        """
        Generates normalized embeddings for a list of document chunk texts.
        Returns a 2D numpy array of shape (N, dimension) with dtype float32.
        """
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        embeddings = self.model.encode(
            texts,
            batch_size=32,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        return embeddings.astype(np.float32)

    def embed_query(self, query: str) -> np.ndarray:
        """
        Generates a normalized embedding for a single user query.
        Returns a 1D or 2D numpy array of shape (1, dimension) with dtype float32.
        """
        if not query or not query.strip():
            raise ValueError("Query string cannot be empty")

        embedding = self.model.encode(
            query.strip(),
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        embedding_2d = np.expand_dims(embedding, axis=0)
        return embedding_2d.astype(np.float32)
