from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import sys
from pathlib import Path

# Добавляем путь к модулям
sys.path.append(str(Path(__file__).parent.parent))

from models.whisper_service import get_whisper_service
from models.config import API_HOST, API_PORT

app = FastAPI(title="AI Interview Assistant API")

# CORS для Chrome расширения
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    text: str
    context: str = ""
    language: str = "ru"

# Инициализация сервисов при запуске
whisper_service = None

@app.on_event("startup")
async def startup_event():
    """Инициализация моделей при запуске сервера"""
    global whisper_service

    print("🚀 Запуск AI Interview Assistant API...")

    try:
        print("📥 Загрузка Whisper модели...")
        whisper_service = get_whisper_service()
        print("✅ Whisper загружен успешно")
    except Exception as e:
        print(f"⚠️  Ошибка загрузки Whisper: {e}")
        whisper_service = None

@app.get("/")
async def root():
    return {"status": "AI Interview Assistant API is running"}

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Преобразование аудио в текст с помощью Whisper
    """
    if whisper_service is None:
        raise HTTPException(status_code=503, detail="Whisper service not available")

    try:
        # Читаем аудио данные
        audio_data = await audio.read()

        # Транскрибируем
        result = whisper_service.transcribe(audio_data)

        return {
            "success": True,
            "text": result["text"],
            "language": result["language"],
            "language_probability": result["language_probability"],
            "segments": result["segments"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

@app.post("/api/generate-answer")
async def generate_answer(request: QuestionRequest):
    """
    Генерация ответа на вопрос с помощью LLM
    TODO: Будет реализовано другим разработчиком
    """
    raise HTTPException(status_code=501, detail="LLM service not implemented yet")

@app.get("/api/health")
async def health_check():
    """
    Проверка состояния сервиса и моделей
    """
    whisper_status = "loaded" if whisper_service is not None else "not_loaded"

    return {
        "status": "healthy",
        "models": {
            "whisper": whisper_status
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host=API_HOST, port=API_PORT)
