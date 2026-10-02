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
│   │   ├── sidepanel/      # UI боковой панели (React)
│   │   ├── permission/     # Страница запроса доступа к микрофону
│   │   ├── background/     # Background service worker
│   │   └── lib/            # API-клиент, запись звука, хранилище
│   ├── public/             # manifest.json и иконки
│   └── dist/               # Собранное расширение (генерируется)
├── docs/                    # Документация
├── scripts/                 # Скрипты для установки и настройки
└── tests/                   # Тесты
```

## 🛠 Технологии

### Модели (бесплатные, локальные)
- **Speech-to-Text:** Whisper (faster-whisper)
- **Text Generation:** Qwen 3 (qwen3:4b) (через Ollama)

### Backend
- Python (FastAPI)
- Ollama для управления LLM

### Chrome Extension
- React 19 + TypeScript, Vite, Tailwind CSS v4 (стиль iOS liquid glass)
- Chrome Extension Manifest V3, Side Panel API

## 🚀 Быстрый старт

### Вариант 1: Docker (Рекомендуется)

```bash
# Windows
scripts\docker-setup.bat

# Linux/Mac
chmod +x scripts/docker-setup.sh
./scripts/docker-setup.sh
```

### Вариант 2: Локальная установка

```bash
# Установить и запустить Ollama: https://ollama.com/download
# Linux: curl -fsSL https://ollama.com/install.sh | sh

# Загрузить модель
ollama pull qwen3:4b

# Установить Python зависимости
cd backend
pip install -r requirements.txt

# Запуск
python api/server.py
```

Qwen setup, exact commands, API examples, changes and rationale: [docs/QWEN_SETUP.md](docs/QWEN_SETUP.md).

Подробнее о Whisper: [docs/WHISPER_SETUP.md](docs/WHISPER_SETUP.md)

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
  Источник: микрофон, звук текущей вкладки (Meet/Zoom в браузере) или оба. При первой записи с микрофона
  откроется вкладка с запросом доступа.
- **Текст** — введите вопрос и нажмите отправить (или Ctrl+Enter).
- В настройках: адрес backend, язык ответа, автоответ после распознавания, контекст о себе.

## 📝 TODO
- [x] Настроить backend API
- [x] Интегрировать Whisper
- [x] Интегрировать Ollama / Qwen
- [x] Создать UI расширения
- [x] Добавить захват аудио
- [ ] Протестировать на реальных собеседованиях
