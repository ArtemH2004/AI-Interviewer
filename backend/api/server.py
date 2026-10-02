from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import sys
from pathlib import Path

# Добавляем путь к модулям
sys.path.append(str(Path(__file__).parent.parent))

from models.whisper_service import get_whisper_service
from models.config import API_HOST, API_PORT, QWEN_MODEL, WHISPER_MODEL
from models.qwen_service import QwenService, QwenServiceError

# Инициализация сервисов при запуске
whisper_service = None
qwen_service = QwenService()


def load_whisper():
    """Загрузка Whisper; при первом запуске модель скачивается из HuggingFace"""
    global whisper_service
    try:
        print("📥 Загрузка Whisper модели...")
        whisper_service = get_whisper_service()
        print("✅ Whisper загружен успешно")
    except Exception as e:
        print(f"⚠️  Ошибка загрузки Whisper: {e}")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print("🚀 Запуск AI Interview Assistant API...")
    load_whisper()
    yield


app = FastAPI(title="AI Interview Assistant API", lifespan=lifespan)

# CORS: расширению хватает host_permissions, а cookies API не использует
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    context: str = Field(default="", max_length=20000)
    language: str = Field(default="ru", min_length=2, max_length=16, pattern=r"^[a-zA-Z-]+$")

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Question must not be blank")
        return value.strip()

@app.get("/")
async def root():
    return {"status": "AI Interview Assistant API is running"}

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Преобразование аудио в текст с помощью Whisper
    """
    # Если при старте модель не скачалась (например, не было сети) — пробуем ещё раз
    if whisper_service is None:
        await run_in_threadpool(load_whisper)
    if whisper_service is None:
        raise HTTPException(status_code=503, detail="Whisper service not available")

    audio_data = await audio.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        result = await run_in_threadpool(whisper_service.transcribe, audio_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {e}") from e
    return {"success": True, **result}

@app.post("/api/generate-answer")
async def generate_answer(request: QuestionRequest):
    """Generate an interview answer using Qwen; audio stays with Whisper."""
    try:
        return await qwen_service.generate_answer(request.text, request.context, request.language)
    except QwenServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc

@app.get("/api/health")
async def health_check():
    """
    Проверка состояния сервиса и моделей
    """
    whisper_status = "loaded" if whisper_service is not None else "not_loaded"

    return {
        "status": "healthy",
        "models": {
            "whisper": whisper_status,
            "qwen": await qwen_service.health()
        },
        "whisper_model": WHISPER_MODEL,
        "qwen_model": QWEN_MODEL
    }

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=API_HOST, port=API_PORT)
