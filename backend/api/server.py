from contextlib import asynccontextmanager
from threading import Lock

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from backend.models.whisper_service import WhisperService
from backend.models.config import (EMBEDDING_MODEL, QWEN_MODEL, WHISPER_MODEL,
    WHISPER_DEVICE, WHISPER_COMPUTE_TYPE, MAX_AUDIO_BYTES)
from backend.models.embedding_service import EmbeddingService, EmbeddingServiceError
from backend.models.qwen_service import QwenService, QwenServiceError

# Инициализация сервисов при запуске
whisper_service = None
qwen_service = QwenService()
embedding_service = EmbeddingService()
_whisper_lock = Lock()


def load_whisper():
    """Загрузка Whisper; при первом запуске модель скачивается из HuggingFace"""
    global whisper_service
    with _whisper_lock:
        if whisper_service is not None:
            return
        try:
            print("📥 Загрузка Whisper модели...")
            whisper_service = WhisperService(WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE)
            print("✅ Whisper загружен успешно")
        except Exception as e:
            print(f"⚠️  Ошибка загрузки Whisper: {e}")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global whisper_service
    print("🚀 Запуск AI Interview Assistant API...")
    await run_in_threadpool(load_whisper)
    try:
        yield
    finally:
        with _whisper_lock:
            whisper_service = None


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
    language: str = Field(default="ru", min_length=2, max_length=16, pattern=r"^[a-zA-Z-]+$")
    context: str = Field(default="", max_length=20000)

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
    # Read at most the configured limit plus one byte, before loading the model.
    try:
        audio_data = await audio.read(MAX_AUDIO_BYTES + 1)
    finally:
        await audio.close()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(audio_data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large")

    # Если при старте модель не скачалась (например, не было сети) — пробуем ещё раз
    if whisper_service is None:
        await run_in_threadpool(load_whisper)
    if whisper_service is None:
        raise HTTPException(status_code=503, detail="Whisper service not available")

    try:
        result = await run_in_threadpool(whisper_service.transcribe, audio_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {e}") from e
    return {"success": True, **result}

@app.post("/api/generate-answer")
async def generate_answer(request: QuestionRequest):
    """Retrieve candidate context and generate an answer using Qwen."""
    try:
        context = await embedding_service.select_context(request.text, request.context.strip())
        return await qwen_service.generate_answer(request.text, request.language, context)
    except (EmbeddingServiceError, QwenServiceError) as exc:
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
            "qwen": await qwen_service.health(),
            "embedding": await embedding_service.health()
        },
        "whisper_model": WHISPER_MODEL,
        "qwen_model": QWEN_MODEL,
        "embedding_model": EMBEDDING_MODEL
    }
