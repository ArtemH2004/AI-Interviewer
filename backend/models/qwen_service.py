"""Local interview answer generation through Ollama's chat API."""
import httpx

from .config import OLLAMA_BASE_URL, QWEN_MODEL, QWEN_TIMEOUT


class QwenServiceError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


class QwenService:
    async def generate_answer(self, text: str, context: str, language: str) -> dict:
        messages = [
            {"role": "system", "content": (
                "Help the user practice interview questions. Give a concise, accurate answer "
                "that can be spoken aloud, with a short example when useful. "
                "Do not invent the candidate's work history, qualifications or achievements. "
                "Use provided candidate context when relevant; otherwise give a general answer. "
                f"Answer in the language identified by this code: {language}."
            )},
            {"role": "user", "content": (
                f"Candidate context:\n{context or '(not provided)'}\n\n"
                f"Interview question:\n{text}"
            )},
        ]
        try:
            async with httpx.AsyncClient(timeout=QWEN_TIMEOUT) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={"model": QWEN_MODEL, "messages": messages,
                          "stream": False, "think": False,
                          "options": {"temperature": 0.4, "num_predict": 1024}},
                )
        except httpx.TimeoutException as exc:
            raise QwenServiceError(504, "Qwen timed out. Retry or increase QWEN_TIMEOUT.") from exc
        except httpx.RequestError as exc:
            raise QwenServiceError(503, "Ollama is unavailable. Start Ollama and check OLLAMA_BASE_URL.") from exc

        if response.status_code == 404:
            raise QwenServiceError(503, f"Qwen model unavailable. Run: ollama pull {QWEN_MODEL}")
        if response.is_error:
            raise QwenServiceError(502, "Ollama failed to generate an answer. Check Ollama logs.")
        try:
            data = response.json()
            answer = data["message"]["content"]
            if not isinstance(answer, str) or not answer.strip():
                raise ValueError("Empty answer")
        except (ValueError, KeyError, TypeError) as exc:
            raise QwenServiceError(502, "Ollama returned an invalid or empty answer.") from exc
        return {"success": True, "answer": answer.strip(), "model": QWEN_MODEL}

    async def health(self) -> str:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                response.raise_for_status()
                models = response.json()["models"]
                return "ready" if any(model["name"] == QWEN_MODEL for model in models) else "model_missing"
        except (httpx.HTTPError, ValueError, KeyError, TypeError):
            return "unavailable"
