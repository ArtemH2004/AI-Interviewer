# AI Interview Assistant

AI-ассистент для помощи в прохождении собеседований с использованием локальных моделей.

## 📁 Структура проекта

```
AI-Interviewer/
├── backend/                  # Локальный сервер для обработки
│   ├── api/                 # API endpoints
│   └── models/              # Конфигурация и загрузка моделей
├── frontend/                # Chrome расширение (React + Vite)
│   ├── src/
│   │   ├── index.html      # Главная страница расширения
│   │   ├── main.tsx        # Точка входа React
│   │   ├── App.tsx         # Состояние и интерфейс приложения
│   │   ├── components/     # Компоненты интерфейса и общие UI-примитивы
│   │   ├── permission/     # Страница запроса доступа к микрофону
│   │   ├── extension/      # Service worker расширения
│   │   ├── services/       # API, запись, хранилище и тема
│   │   └── styles.css      # Общие стили
│   ├── public/             # manifest.json и иконки
│   └── dist/               # Собранное расширение (генерируется)
├── docs/                    # Документация
├── setup.bat                # Установка и настройка для Windows
└── tests/                   # Тесты
```

## 🛠 Технологии

### Модели (бесплатные, локальные)
- **Speech-to-Text:** Whisper `base` (faster-whisper)
- **Text Generation:** Qwen 3 (qwen3:1.7b) (через Ollama)

### Backend
- Python (FastAPI)
- Ollama для управления LLM

### Chrome Extension
- React 19 + TypeScript, Vite, Tailwind CSS v4 (стиль iOS liquid glass)
- Chrome Extension Manifest V3, Side Panel API

## 🚀 Быстрый старт

### Вариант 1: Docker (Рекомендуется)

В Windows запустите скрипт и выберите Docker (1) или локальную установку (2). Скрипт создаст `.env` из `.env.example`, если файла ещё нет. Для Docker нужен запущенный Docker Desktop, для локальной установки — Python и запущенная Ollama.

```bash
setup.bat
```

В Linux и macOS Docker можно запустить вручную по инструкциям в [QWEN_SETUP.md](docs/QWEN_SETUP.md#docker-setup).

### Вариант 2: Локальная установка

```bash
# Установить и запустить Ollama: https://ollama.com/download
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# Загрузить модели
ollama pull qwen3:1.7b
ollama pull qwen3-embedding:0.6b

# Установить Python зависимости
pip install -r backend/requirements.txt

# Запуск
python -m uvicorn backend.api.server:app --host 127.0.0.1 --port 8000
```

Команды выполняются из корня проекта; предварительно скопируйте `.env.example` в `.env`. Настройки расширения позволяют сохранить опыт кандидата локально в браузере: при каждом запросе он отправляется на backend, где подходящие фрагменты передаются Qwen. Для короткого контекста embeddings не вычисляются. Загружаемое аудио ограничено значением `MAX_AUDIO_BYTES`.

Qwen setup, exact commands, API examples, changes and rationale: [docs/QWEN_SETUP.md](docs/QWEN_SETUP.md).

Подробнее о Whisper: [docs/WHISPER_SETUP.md](docs/WHISPER_SETUP.md)

### GPU

- **NVIDIA** — и Whisper, и Qwen ускоряются через CUDA (см. раздел GPU в [docs/WHISPER_SETUP.md](docs/WHISPER_SETUP.md#gpu-опционально)).
- **Intel / AMD (в т.ч. встроенная Iris Xe)** — Docker на Windows пробрасывает в контейнер только NVIDIA,
  а faster-whisper умеет только CUDA. Ускорить можно Qwen: запустить Ollama нативно на Windows
  (Vulkan в свежих версиях включён по умолчанию, в старых — `OLLAMA_VULKAN=1`) и направить backend на неё —
  в `.env`: `OLLAMA_DOCKER_BASE_URL=http://host.docker.internal:11434`. Поддержка встроенных Intel GPU экспериментальная:
  проверьте в `ollama ps`, что модель на GPU, и что ответы адекватные. Whisper остаётся на CPU.

### Установка Chrome расширения
```bash
cd frontend
npm install
npm run build        # или npm run dev — пересборка при изменениях
```
1. Открыть `chrome://extensions/`
2. Включить "Режим разработчика"
3. Нажать "Загрузить распакованное расширение"
4. Выбрать папку `frontend/dist/`
5. Нажать на иконку расширения — откроется боковая панель

Использование:
- **Голос** — нажмите кнопку записи, задайте вопрос, нажмите ещё раз. Whisper распознает речь, Qwen ответит.
  Источник: микрофон, звук выбранной вкладки (Meet/Zoom в браузере) или оба. Для звука вкладки выберите её в диалоге и включите передачу звука. При первой записи с микрофона
  откроется вкладка с запросом доступа.
- **Текст** — введите вопрос и нажмите Enter (Ctrl+Enter — перенос строки).
- В настройках: тема, язык ответа и автоответ после распознавания.

## Тестирование моделей

Установите Python-зависимости (`pip install -r backend/requirements.txt`) и запустите backend и Ollama с загруженными моделями. Затем выполните из корня проекта:

```bash
python tests/model_report.py
```

Команда запускает тесты Qwen, Whisper и embeddings и сохраняет отчёты в `tests/results/`. Проверки реальной модели embeddings пропускаются, если она недоступна по адресу `OLLAMA_BASE_URL`.

## 📝 TODO
- [x] Настроить backend API
- [x] Интегрировать Whisper
- [x] Интегрировать Ollama / Qwen
- [x] Создать UI расширения
- [x] Добавить захват аудио
- [ ] Протестировать на реальных собеседованиях
