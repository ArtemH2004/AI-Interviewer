"""
Конфигурация моделей для AI Interview Assistant
"""
import os

# Whisper настройки (переопределяются переменными окружения, см. docker-compose.yml)
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large-v3
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")    # cpu, cuda (только NVIDIA) или auto
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")  # int8, float16 (cuda), float32

# API настройки
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Qwen answer generation only; Whisper settings above stay independent.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen3:1.7b")
QWEN_TIMEOUT = float(os.getenv("QWEN_TIMEOUT", "120"))
