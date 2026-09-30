import logging
from backend.app.config import settings
from backend.app.services.vector_store import VectorStoreService
from backend.app.services.llm_service import LLMService

logger = logging.getLogger("documind.rag")

class RAGPipeline:
    """
    Orchestrates the complete Retrieval-Augmented Generation (RAG) workflow:
    1. Embeds the user question
    2. Performs FAISS similarity search for top-K chunks
    3. Formats document context with provenance metadata
    4. Invokes Google Gemini with strict grounding instructions
    5. Returns grounded answer alongside verified source documents and page numbers
    """

    def __init__(
        self,
        vector_store: VectorStoreService | None = None,
        llm_service: LLMService | None = None
    ):
        self.vector_store = vector_store or VectorStoreService()
        self.llm_service = llm_service or LLMService()

    def answer_question(self, question: str, top_k: int | None = None) -> dict:
        """
        Executes the RAG query pipeline.

        Returns:
            dict containing:
            - answer (str)
            - sources (list of source dicts with doc name, page num, snippet, score)
            - retrieved_count (int)
            - model_used (str)
        """
        clean_question = question.strip()
        if not clean_question:
            raise ValueError("Question cannot be empty.")

        # Step 1: Semantic search in FAISS vector store
        k = top_k or settings.TOP_K
        retrieved_chunks = self.vector_store.search(clean_question, top_k=k)

        # Handle case where no documents have been indexed yet
        if not retrieved_chunks:
            return {
                "answer": "No relevant information was found in the uploaded documents. Please make sure documents are uploaded and processed.",
                "sources": [],
                "retrieved_count": 0,
                "model_used": settings.GEMINI_MODEL
            }

        # Step 2: Format sources for client response
        sources = []
        for chunk in retrieved_chunks:
            text = chunk.get("chunk_text", "")
            # Create a clean preview snippet
            snippet = (text[:220] + "...") if len(text) > 220 else text

            sources.append({
                "chunk_id": chunk.get("chunk_id", ""),
                "document_id": chunk.get("document_id"),
                "document_name": chunk.get("document_name", "Unknown Document"),
                "page_number": chunk.get("page_number", 1),
                "chunk_snippet": snippet,
                "score": chunk.get("score", 0.0)
            })

        # Step 3: Call Gemini LLM with retrieved context
        try:
            answer = self.llm_service.generate_answer(clean_question, retrieved_chunks)
        except Exception as e:
            logger.error(f"Error during LLM generation: {e}")
            raise

        return {
            "answer": answer,
            "sources": sources,
            "retrieved_count": len(retrieved_chunks),
            "model_used": settings.GEMINI_MODEL
        }
