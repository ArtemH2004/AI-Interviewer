ARG PYTHON_IMAGE
FROM ${PYTHON_IMAGE}


# Рабочая директория
WORKDIR /app

# Копируем requirements
COPY requirements.txt /tmp/requirements.txt

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Копируем код приложения
COPY . /app/backend

# Открываем порт
# Команда запуска
CMD ["sh", "-c", "exec uvicorn backend.api.server:app --host \"$API_HOST\" --port \"$API_PORT\""]
