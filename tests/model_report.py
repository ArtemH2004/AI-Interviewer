"""
Прогон моделей на примерах: запрос → ответ, результаты в tests/results/whisper.md и qwen.md.

Нужен запущенный backend (docker compose up -d):

    python tests/model_report.py
"""
from pathlib import Path

import httpx

API_URL = "http://localhost:8000"
TESTS_DIR = Path(__file__).parent
RESULTS_DIR = TESTS_DIR / "results"

AUDIO_FILES = ["test_audio.wav"]

QUESTIONS = [
    {"text": "Чем список отличается от кортежа в Python?", "language": "ru"},
    {"text": "Что такое индекс в базе данных и когда он замедляет работу?", "language": "ru"},
    {"text": "Расскажите о своём опыте работы с базами данных.", "language": "ru",
     "context": "Python-разработчик, 2 года опыта, Django и PostgreSQL."},
    {"text": "What is the difference between a process and a thread?", "language": "en"},
    {"text": "Explain REST API in simple terms.", "language": "en"},
]


def main():
    RESULTS_DIR.mkdir(exist_ok=True)
    with httpx.Client(base_url=API_URL, timeout=300) as client:
        health = client.get("/api/health").json()

        lines = [f"# Whisper `{health['whisper_model']}`"]
        for name in AUDIO_FILES:
            response = client.post("/api/transcribe", files={"audio": (name, (TESTS_DIR / name).read_bytes())})
            response.raise_for_status()
            lines += ["", f"## Запрос: `tests/{name}`", "", "**Ответ:**", "", f"> {response.json()['text']}"]
        (RESULTS_DIR / "whisper.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

        lines = [f"# Qwen `{health['qwen_model']}`"]
        for question in QUESTIONS:
            response = client.post("/api/generate-answer", json=question)
            response.raise_for_status()
            lines += ["", f"## Запрос: {question['text']}", ""]
            if question.get("context"):
                lines += [f"Контекст: _{question['context']}_", ""]
            lines += ["**Ответ:**", "", response.json()["answer"]]
        (RESULTS_DIR / "qwen.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print("Готово: tests/results/whisper.md, tests/results/qwen.md")


if __name__ == "__main__":
    main()
