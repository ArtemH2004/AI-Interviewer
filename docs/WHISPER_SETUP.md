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

Помимо backend, в `docker-compose.yml` есть сервис `ollama` для генерации ответов (Qwen) — см. [QWEN_SETUP.md](QWEN_SETUP.md).

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
    "whisper": "loaded",
    "qwen": "ready"
  },
  "whisper_model": "base",
  "qwen_model": "qwen3:1.7b"
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
| `WHISPER_MODEL`         | `base`    | `tiny`, `base`, `small`, `medium`, `large-v3` |
| `WHISPER_DEVICE`        | `cpu`     | `cpu`, `cuda` (только NVIDIA), `auto` |
| `WHISPER_COMPUTE_TYPE`  | `int8`    | `int8`, `float16` (cuda), `float32` |
| `API_HOST`              | `0.0.0.0` | —                                    |
| `API_PORT`              | `8000`    | —                                    |

Для Docker их удобно задавать в файле `.env` в корне проекта (Compose подставляет их в `docker-compose.yml`):

```bash
WHISPER_MODEL=small
```

После изменения пересоздайте контейнер:

```bash
docker compose up -d backend
```

### Размеры моделей

| Модель    | Размер | Скорость | Качество |
|-----------|--------|----------|----------|
| tiny      | 75 MB  | ⚡⚡⚡     | ⭐       |
| base ⭐   | 145 MB | ⚡⚡      | ⭐⭐     |
| small     | 466 MB | ⚡       | ⭐⭐⭐   |
| medium    | 1.5 GB | 🐌       | ⭐⭐⭐⭐ |
| large-v3  | 3 GB   | 🐌🐌     | ⭐⭐⭐⭐⭐|

**По умолчанию:** `base` — лёгкая и быстрая на CPU. Если распознавание неточное, попробуйте `small`.

### GPU (опционально)

faster-whisper (CTranslate2) ускоряется **только на NVIDIA (CUDA)**. Intel/AMD GPU, включая встроенную Iris Xe, он не поддерживает — на таких машинах Whisper работает на CPU (ускорить Qwen можно через нативную Ollama с Vulkan, см. [README](../README.md#gpu)).

Для NVIDIA (Docker Desktop + WSL2 с актуальным драйвером):

1. Добавьте в `backend/requirements.txt` CUDA-библиотеки: `nvidia-cublas-cu12` и `nvidia-cudnn-cu12==9.*`, а в `Dockerfile` — путь к ним:
   `ENV LD_LIBRARY_PATH=/usr/local/lib/python3.11/site-packages/nvidia/cublas/lib:/usr/local/lib/python3.11/site-packages/nvidia/cudnn/lib`
2. Пробросьте GPU в сервисы `backend` и `ollama` в `docker-compose.yml`:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

3. В `.env`: `WHISPER_DEVICE=cuda` и `WHISPER_COMPUTE_TYPE=float16`, затем `docker compose up -d --build`.

## API

### GET /api/health
Проверка состояния сервиса.

**Response:**
```json
{
  "status": "healthy",
  "models": {
    "whisper": "loaded",
    "qwen": "ready"
  },
  "whisper_model": "base",
  "qwen_model": "qwen3:1.7b"
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
    {"start": 0.0, "end": 2.4, "text": "...", "avg_logprob": -0.12}
  ]
}
```

`avg_logprob` — средняя лог-вероятность токенов сегмента (≤ 0, чем ближе к 0, тем увереннее модель), а не процент уверенности. Пустой файл → `400`.

### POST /api/generate-answer
Генерация ответа через Qwen — см. [QWEN_SETUP.md](QWEN_SETUP.md).

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
- Размер: ~145 MB для модели `base`
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
Системный ffmpeg не нужен: PyAV поставляется со встроенным ffmpeg. `av` закреплён на `<19`: в версии 19 удалён параметр `metadata_errors`, и `faster-whisper 1.2.1` падает с `TypeError: open() got an unexpected keyword argument 'metadata_errors'`. Актуальный `backend/requirements.txt` использует `faster-whisper>=1.2`, для которого на PyPI есть готовый wheel пакета `av` (не требует компиляции и системных `-dev` библиотек ffmpeg). Если вы видите ошибки сборки `av` из исходников (`gcc: ... AV_OPT_TYPE_CHANNEL_LAYOUT ...`), проверьте, что `faster-whisper` не понижен до `0.10.x` — эта версия жёстко требует `av==11.*`, для которого может не быть готового wheel-пакета под ваш образ Python.

### Whisper медленно загружается при первом запуске
Модель скачивается из HuggingFace (~145 MB для `base`). Следите за прогрессом:
```bash
docker compose logs -f backend
```
Дождитесь строки `Application startup complete.`

### Медленная транскрипция
- Используйте модель меньшего размера: `WHISPER_MODEL=base` или `small`
- При наличии NVIDIA GPU: см. [GPU](#gpu-опционально)

### Недостаточно памяти
Увеличьте лимит памяти Docker Desktop (Settings → Resources → Memory → 8GB+) либо используйте модель меньшего размера.

### Изменил переменную окружения, но ничего не поменялось
Убедитесь, что контейнер пересоздан после изменения `.env` или `docker-compose.yml` (`restart` настройки не перечитывает):
```bash
docker compose up -d backend
```

## Очистка

```bash
docker compose down           # остановить контейнер
docker compose down -v        # + удалить volume с кэшем моделей
docker rmi ai-interviewer-backend
```
