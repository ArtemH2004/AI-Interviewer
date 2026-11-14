"""Integration tests against the running backend and its real Qwen model."""
import os
import unittest
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
API_HOST = os.environ.get("API_PUBLISH_HOST", "127.0.0.1")
if API_HOST in ("0.0.0.0", "::"):
    API_HOST = "127.0.0.1"
API_PORT = os.environ.get("API_PUBLISH_PORT", "8000")
API_URL = f"http://{API_HOST}:{API_PORT}"
QUESTIONS = [
    {"text": "Чем список отличается от кортежа в Python?", "language": "ru"},
    {"text": "Что такое индекс в базе данных и когда он замедляет работу?", "language": "ru"},
    {"text": "What is the difference between a process and a thread?", "language": "en"},
    {"text": "Explain REST API in simple terms.", "language": "en"},
]


class QwenIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = httpx.Client(base_url=API_URL, timeout=300)
        try:
            response = cls.client.get("/api/health")
            response.raise_for_status()
            health = response.json()
            if health.get("models", {}).get("qwen") != "ready":
                raise RuntimeError(f"Qwen is not ready: {health.get('models', {}).get('qwen')}")
            cls.model = health["qwen_model"]
        except (httpx.HTTPError, ValueError, KeyError, RuntimeError) as exc:
            cls.client.close()
            raise RuntimeError(
                f"Qwen is unavailable at {API_URL}. Start Docker services and pull "
                "the configured Qwen model using setup.bat."
            ) from exc

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_real_model_generates_answer(self):
        self.report_lines = [f"Модель: `{self.model}`", ""]
        for question in QUESTIONS:
            self.report_lines += [f"### Вопрос: {question['text']}", ""]
            response = self.client.post("/api/generate-answer", json=question)
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()
            self.report_lines += [str(data.get("answer", "")), ""]
            self.assertTrue(data.get("success"), data)
            self.assertEqual(data.get("model"), self.model)
            self.assertIsInstance(data.get("answer"), str)
            self.assertTrue(data["answer"].strip(), "Qwen returned an empty answer")
            print(f"\nQwen ({self.model}): {data['answer']}")

    def test_blank_question_is_rejected(self):
        response = self.client.post("/api/generate-answer", json={"text": "   "})
        self.assertEqual(response.status_code, 422, response.text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
