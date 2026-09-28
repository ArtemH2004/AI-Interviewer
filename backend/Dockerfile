FROM python:3.11-slim

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копируем requirements
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY . .

# Открываем порт
EXPOSE 8000

# Переменные окружения
ENV PYTHONUNBUFFERED=1
ENV WHISPER_MODEL=medium
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8

# Команда запуска
CMD ["python", "api/server.py"]
