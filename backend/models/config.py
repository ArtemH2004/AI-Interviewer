"""
Конфигурация моделей для AI Interview Assistant
"""
import os

# Whisper настройки (переопределяются переменными окружения, см. docker-compose.yml)
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "medium")  # tiny, base, small, medium, large-v3
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")    # cpu или cuda
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")  # int8, float16, float32

# API настройки
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

