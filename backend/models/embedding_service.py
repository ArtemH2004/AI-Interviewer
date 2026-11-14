"""Text embeddings through Ollama's embed API and retrieval of relevant context (RAG)."""
import math
import re

import httpx

from .config import EMBEDDING_MODEL, EMBEDDING_TIMEOUT, OLLAMA_BASE_URL, RAG_CHUNK_SIZE, RAG_TOP_K


class EmbeddingServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("Vectors must have the same length")
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return sum(x * y for x, y in zip(a, b)) / norm if norm else 0.0


def chunk_text(text: str, chunk_size: int = RAG_CHUNK_SIZE) -> list[str]:
    """Split text into sentences/lines and pack them into chunks of at most chunk_size characters."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if s.strip()]
    parts = []
    for sentence in sentences:
        if len(sentence) <= chunk_size:
            parts.append(sentence)
            continue
        current_part = ""
        for word in sentence.split():
            if current_part and len(current_part) + 1 + len(word) > chunk_size:
                parts.append(current_part)
                current_part = ""
            while len(word) > chunk_size:
                parts.append(word[:chunk_size])
                word = word[chunk_size:]
            current_part = f"{current_part} {word}" if current_part else word
        if current_part:
            parts.append(current_part)
    chunks, current = [], ""
    for sentence in parts:
        if current and len(current) + 1 + len(sentence) > chunk_size:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}" if current else sentence
    if current:
        chunks.append(current)
    return chunks


class EmbeddingService:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            async with httpx.AsyncClient(timeout=EMBEDDING_TIMEOUT) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/embed",
                    json={"model": EMBEDDING_MODEL, "input": texts},
                )
        except httpx.TimeoutException as exc:
            raise EmbeddingServiceError(504, "Embedding model timed out. Retry or increase EMBEDDING_TIMEOUT.") from exc
        except httpx.RequestError as exc:
            raise EmbeddingServiceError(503, "Ollama is unavailable. Start Ollama and check OLLAMA_BASE_URL.") from exc

        if response.status_code == 404:
            raise EmbeddingServiceError(503, f"Embedding model unavailable. Run: ollama pull {EMBEDDING_MODEL}")
        if response.is_error:
            raise EmbeddingServiceError(502, "Ollama failed to compute embeddings. Check Ollama logs.")
        try:
            embeddings = response.json()["embeddings"]
            if (not isinstance(embeddings, list) or len(embeddings) != len(texts)
                    or not all(isinstance(v, list) and v and all(
                        isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)
                        for x in v) for v in embeddings)
                    or len({len(v) for v in embeddings}) != 1):
                raise ValueError("Embedding count mismatch")
        except (ValueError, KeyError, TypeError) as exc:
            raise EmbeddingServiceError(502, "Ollama returned invalid embeddings.") from exc
        return embeddings

    async def retrieve(self, query: str, context: str, top_k: int = RAG_TOP_K,
                       chunk_size: int = RAG_CHUNK_SIZE) -> list[str]:
        """Return the top_k context chunks most similar to the query, in their original order."""
        chunks = chunk_text(context, chunk_size)
        if len(chunks) <= top_k:
            return chunks
        query_vector, *chunk_vectors = await self.embed([query, *chunks])
        scores = [cosine_similarity(query_vector, vector) for vector in chunk_vectors]
        best = sorted(range(len(chunks)), key=lambda i: scores[i], reverse=True)[:top_k]
        return [chunks[i] for i in sorted(best)]

    async def select_context(self, query: str, context: str) -> str:
        """Return relevant context; surface embedding failures instead of hiding them."""
        return "\n".join(await self.retrieve(query, context))

    async def health(self) -> str:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                response.raise_for_status()
                models = response.json()["models"]
                return "ready" if any(model["name"] == EMBEDDING_MODEL for model in models) else "model_missing"
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return "unavailable"
