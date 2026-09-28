# Whisper Setup Guide

Полное руководство по Speech-to-Text сервису на базе `faster-whisper`: запуск в Docker (рекомендуется), локальная установка, конфигурация, API, тестирование и troubleshooting.

## Архитектура

```
┌─────────────────────────────────┐
│  Chrome Extension (Host)        │
│  http://localhost:8000          │
└───────────────┬─────────────────┘
                │
        ┌───────▼────────┐
        │   backend      │
        │   :8000        │
        │                │
        │  - FastAPI     │
        │  - Whisper     │
        └────────────────┘
```

Backend — единственный сервис в `docker-compose.yml`. Генерация ответов (LLM) пока не реализована (`POST /api/generate-answer` возвращает `501`).

## Вариант 1: Docker (рекомендуется)

### Требования
- Docker Desktop установлен и запущен

### Запуск

```bash
# Windows
scripts\docker-setup.bat

# Linux/Mac
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

Или вручную:

```bash
# Собрать и запустить
docker compose up --build -d

# Статус
docker compose ps

# Логи (следить за загрузкой модели)
docker compose logs -f backend
```

При первом запуске `faster-whisper` скачивает модель из HuggingFace прямо внутри контейнера — это может занять несколько минут в зависимости от размера модели и скорости сети. Модель кэшируется в volume `whisper-cache`, поэтому повторные запуски и пересборки образа не требуют повторного скачивания.

### Проверка

```bash
curl http://localhost:8000/api/health
```

Ожидаемый ответ:
```json
{
  "status": "healthy",
  "models": {
    "whisper": "loaded"
  }
}
```

### Управление контейнером

```bash
docker compose restart          # перезапуск
docker compose down             # остановка
docker compose down -v          # остановка + удаление volume (кэш модели будет стёрт)
docker compose logs -f backend  # логи backend
docker compose exec backend bash  # зайти внутрь контейнера
```

## Вариант 2: Локальная установка (без Docker)

```bash
cd backend
pip install -r requirements.txt
python api/server.py
```

Сервер запустится на `http://localhost:8000` (адрес и порт берутся из `backend/models/config.py`, см. [Конфигурация](#конфигурация)).

## Конфигурация

Настройки читаются из переменных окружения (`backend/models/config.py`, `os.getenv`), с дефолтами на случай локального запуска без Docker:

| Переменная            | Дефолт    | Значения                           |
|------------------------|-----------|-------------------------------------|
| `WHISPER_MODEL`         | `medium`  | `tiny`, `base`, `small`, `medium`, `large-v3` |
| `WHISPER_DEVICE`        | `cpu`     | `cpu`, `cuda`                       |
| `WHISPER_COMPUTE_TYPE`  | `int8`    | `int8`, `float16`, `float32`        |
| `API_HOST`              | `0.0.0.0` | —                                    |
| `API_PORT`              | `8000`    | —                                    |

Для Docker эти переменные задаются в `docker-compose.yml`:

```yaml
environment:
  - WHISPER_MODEL=medium
  - WHISPER_DEVICE=cpu
  - WHISPER_COMPUTE_TYPE=int8
```

После изменения модели пересоберите/перезапустите контейнер:

```bash
docker compose up -d --build backend
```

### Размеры моделей

| Модель    | Размер | Скорость | Качество |
|-----------|--------|----------|----------|
| tiny      | 75 MB  | ⚡⚡⚡     | ⭐       |
| base      | 145 MB | ⚡⚡      | ⭐⭐     |
| small     | 466 MB | ⚡       | ⭐⭐⭐   |
| medium ⭐ | 1.5 GB | 🐌       | ⭐⭐⭐⭐ |
| large-v3  | 3 GB   | 🐌🐌     | ⭐⭐⭐⭐⭐|

**Рекомендация:** `medium` — лучший баланс качества и скорости для CPU.

### GPU (опционально)

Требуется NVIDIA Docker Runtime и CUDA-совместимая видеокарта. В `docker-compose.yml` раскомментируйте/добавьте:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
environment:
  - WHISPER_DEVICE=cuda
  - WHISPER_COMPUTE_TYPE=float16
```

## API

### GET /api/health
Проверка состояния сервиса.

**Response:**
```json
{
  "status": "healthy",
  "models": {
    "whisper": "loaded"
  }
}
```

### POST /api/transcribe
Транскрипция аудио файла.

**Request:** `multipart/form-data`, поле файла — **`audio`** (не `file`):

```bash
curl -X POST http://localhost:8000/api/transcribe \
  -F "audio=@path/to/your/audio.wav"
```

**Response:**
```json
{
  "success": true,
  "text": "Транскрибированный текст",
  "language": "ru",
  "language_probability": 0.98,
  "segments": [
    {"start": 0.0, "end": 2.4, "text": "...", "confidence": -0.12}
  ]
}
```

### POST /api/generate-answer
Пока не реализовано — возвращает `501 Not Implemented`.

## Тестирование

```bash
pip install requests
python tests/test_whisper.py
```

Скрипт проверяет `/api/health` и (если есть `tests/test_audio.wav`) отправляет файл на `/api/transcribe`.

## Volumes

### whisper-cache
- Кэш скачанных моделей Whisper (HuggingFace)
- Путь в контейнере: `/root/.cache/huggingface`
- Размер: ~1.5 GB для модели `medium`
- Сохраняется между перезапусками; удаляется через `docker compose down -v`

## Troubleshooting

### Docker: Cannot connect to Docker daemon
Запустите Docker Desktop.

### Docker: port is already allocated
Порт 8000 занят. Измените порт в `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"
```

### Ошибка сборки образа (av / PyAV не собирается)
Актуальный `backend/requirements.txt` использует `faster-whisper>=1.2`, для которого на PyPI есть готовый wheel пакета `av` (не требует компиляции и системных `-dev` библиотек ffmpeg). Если вы видите ошибки сборки `av` из исходников (`gcc: ... AV_OPT_TYPE_CHANNEL_LAYOUT ...`), проверьте, что `faster-whisper` не понижен до `0.10.x` — эта версия жёстко требует `av==11.*`, для которого может не быть готового wheel-пакета под ваш образ Python.

### Whisper медленно загружается при первом запуске
Модель скачивается из HuggingFace (~1.5 GB для `medium`). Следите за прогрессом:
```bash
docker compose logs -f backend
```
Дождитесь строки `Application startup complete.`

### Медленная транскрипция
- Используйте модель меньшего размера: `WHISPER_MODEL=base` или `small`
- При наличии NVIDIA GPU: `WHISPER_DEVICE=cuda`, `WHISPER_COMPUTE_TYPE=float16`

### Недостаточно памяти
Увеличьте лимит памяти Docker Desktop (Settings → Resources → Memory → 8GB+) либо используйте модель меньшего размера.

### Изменил переменную окружения, но ничего не поменялось
Убедитесь, что контейнер пересоздан после изменения `docker-compose.yml`:
```bash
docker compose up -d --build backend
```

## Очистка

```bash
docker compose down           # остановить контейнер
docker compose down -v        # + удалить volume с кэшем моделей
docker rmi ai-interviewer-backend
```
