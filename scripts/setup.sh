#!/bin/bash

echo "🚀 AI Interview Assistant - Setup Script"
echo "========================================"

# Проверка Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 не найден. Установите Python 3.8+"
    exit 1
fi

echo "✅ Python найден: $(python3 --version)"

# Проверка Ollama
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama не найден. Устанавливаю..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama уже установлен"
fi

# Установка Python зависимостей
echo "📦 Установка Python зависимостей..."
cd backend
python3 -m pip install -r requirements.txt

# Загрузка модели Ollama
echo "📥 Загрузка модели Qwen (это может занять несколько минут)..."
ollama pull "${QWEN_MODEL:-qwen3:4b}"

echo ""
echo "✨ Установка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Запустите backend: cd backend && python3 api/server.py"
echo "2. Откройте Chrome: chrome://extensions/"
echo "3. Включите 'Режим разработчика'"
echo "4. Загрузите папку chrome-extension/"
