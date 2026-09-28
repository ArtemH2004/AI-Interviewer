"""
Конфигурация моделей для AI Interview Assistant
"""

# Whisper настройки
WHISPER_MODEL = "medium"  # tiny, base, small, medium, large-v3
WHISPER_DEVICE = "cpu"    # cpu или cuda
WHISPER_COMPUTE_TYPE = "int8"  # int8, float16, float32

# Ollama настройки
OLLAMA_HOST = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"  # или phi3.5, mistral:7b

# API настройки
API_HOST = "127.0.0.1"
API_PORT = 8000

# Системный промпт для генерации ответов
SYSTEM_PROMPT = """Ты - помощник для прохождения собеседований.
Твоя задача - помогать отвечать на технические вопросы кратко, четко и профессионально.
Отвечай на русском языке, если вопрос на русском.
Структурируй ответы и давай конкретные примеры когда это уместно."""
