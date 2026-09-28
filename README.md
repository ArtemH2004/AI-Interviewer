# AI Interview Assistant

AI-ассистент для помощи в прохождении собеседований с использованием локальных моделей.

## 📁 Структура проекта

```
AI-Interviewer/
├── backend/                  # Локальный сервер для обработки
│   ├── api/                 # API endpoints
│   └── models/              # Конфигурация и загрузка моделей
├── chrome-extension/        # Chrome расширение
│   ├── src/
│   │   ├── popup/          # UI popup расширения
│   │   ├── content/        # Content scripts (внедрение в страницы)
│   │   └── background/     # Background service worker
│   └── assets/
│       ├── icons/          # Иконки расширения
│       └── css/            # Стили
├── docs/                    # Документация
├── scripts/                 # Скрипты для установки и настройки
└── tests/                   # Тесты
```

## 🛠 Технологии

### Модели (бесплатные, локальные)
- **Speech-to-Text:** Whisper (faster-whisper)
- **Text Generation:** Llama 3.2 / Phi-3.5 (через Ollama)

### Backend
- Python (FastAPI)
- Ollama для управления LLM

### Chrome Extension
- JavaScript (Vanilla JS или React)
- Chrome Extension Manifest V3

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
# Установить Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Загрузить модель
ollama pull llama3.2:3b

# Установить Python зависимости
cd backend
pip install -r requirements.txt

# Запуск
python api/server.py
```

Подробнее: [docs/WHISPER_SETUP.md](docs/WHISPER_SETUP.md)

### Установка Chrome расширения
1. Открыть `chrome://extensions/`
2. Включить "Режим разработчика"
3. Нажать "Загрузить распакованное расширение"
4. Выбрать папку `chrome-extension/`

## 📝 TODO
- [ ] Настроить backend API
- [ ] Интегрировать Whisper
- [ ] Интегрировать Ollama
- [ ] Создать UI расширения
- [ ] Добавить захват аудио
- [ ] Протестировать на реальных собеседованиях
