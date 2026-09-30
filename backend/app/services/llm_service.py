import json
import logging
import requests
from backend.app.config import settings

logger = logging.getLogger("documind.llm")

SYSTEM_INSTRUCTION = """You are a document question-answering assistant for DocuMind.

Answer the user's question using only the provided document context.

If the answer cannot be found in the provided context, clearly state:
"I couldn't find this information in the uploaded documents."

Strict Rules:
1. Do not invent facts or extrapolate beyond what is in the document context.
2. Do not use external or unsupported knowledge.
3. Do not pretend that information exists in the documents when it does not.
4. When stating facts from the context, be clear, accurate, and concise.
5. If the context partially answers the question, answer only what is supported and state what is missing.
"""

class LLMService:
    """
    Service interfacing with Google Gemini API to generate grounded answers
    from retrieved document context.
    """

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL

    def build_prompt(self, question: str, context_chunks: list[dict]) -> str:
        """
        Formats retrieved context chunks and user question into a structured prompt.
        """
        if not context_chunks:
            return (
                f"User Question: {question}\n\n"
                "Document Context: [No relevant document chunks found in index]\n\n"
                "Please follow instructions and inform the user that no relevant information is available."
            )

        context_blocks = []
        for idx, chunk in enumerate(context_chunks, 1):
            doc_name = chunk.get("document_name", "Unknown Document")
            page_num = chunk.get("page_number", "?")
            text = chunk.get("chunk_text", "").strip()
            score = chunk.get("score", 0.0)
            context_blocks.append(
                f"[Source {idx}: Document '{doc_name}', Page {page_num}, Relevance: {score:.2f}]\n{text}"
            )

        combined_context = "\n\n---\n\n".join(context_blocks)

        prompt = f"""DOCUMENT CONTEXT:
==================================================
{combined_context}
==================================================

USER QUESTION:
{question}

Provide a grounded, factual answer based strictly on the document context above. If the context does not contain the answer, say "I couldn't find this information in the uploaded documents."
"""
        return prompt

    def generate_answer(self, question: str, context_chunks: list[dict]) -> str:
        """
        Sends the grounded prompt to Google Gemini and returns the generated answer.
        """
        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment or .env file."
            )

        prompt = self.build_prompt(question, context_chunks)

        # 1. Try modern google-genai SDK if available
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,  # Low temperature for strict factual grounding
                )
            )
            if response and response.text:
                return response.text.strip()
        except ImportError:
            # Fall back to direct official REST endpoint
            pass
        except Exception as e:
            logger.warning(f"google-genai SDK call failed, trying direct REST: {e}")

        # 2. Direct REST fallback to Gemini API
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}]
                    }
                ],
                "systemInstruction": {
                    "parts": [{"text": SYSTEM_INSTRUCTION}]
                },
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 2048
                }
            }

            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=60
            )

            if resp.status_code != 200:
                error_detail = resp.text
                try:
                    err_json = resp.json()
                    error_detail = err_json.get("error", {}).get("message", error_detail)
                except Exception:
                    pass
                raise RuntimeError(f"Gemini API returned error ({resp.status_code}): {error_detail}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return "I couldn't find this information in the uploaded documents."

            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            text_result = "".join(p.get("text", "") for p in parts)
            return text_result.strip() if text_result else "No answer generated."

        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"Failed to communicate with Gemini API: {str(e)}")
