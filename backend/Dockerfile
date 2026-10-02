FROM python:3.11-slim


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

# Настройки моделей задаются в docker-compose.yml (дефолты — в models/config.py)
ENV PYTHONUNBUFFERED=1

# Команда запуска
CMD ["python", "api/server.py"]
