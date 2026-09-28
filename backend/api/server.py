from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

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

@app.get("/")
async def root():
    return {"status": "AI Interview Assistant API is running"}

@app.post("/api/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Преобразование аудио в текст с помощью Whisper
    """
    try:
        # TODO: Интегрировать faster-whisper
        # audio_data = await audio.read()
        # transcription = whisper_model.transcribe(audio_data)

        return {
            "success": True,
            "text": "Транскрипция будет здесь (Whisper не подключен)",
            "language": "ru"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-answer")
async def generate_answer(request: QuestionRequest):
    """
    Генерация ответа на вопрос с помощью LLM
    """
    try:
        # TODO: Интегрировать Ollama
        # response = ollama.generate(model="llama3.2:3b", prompt=request.text)

        return {
            "success": True,
            "answer": f"Ответ на вопрос: {request.text} (LLM не подключена)",
            "confidence": 0.85
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    """
    Проверка состояния сервиса и моделей
    """
    return {
        "status": "healthy",
        "models": {
            "whisper": "not_loaded",
            "llm": "not_loaded"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
