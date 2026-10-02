#!/bin/bash

echo "🐳 AI Interview Assistant - Whisper Docker Setup"
echo "================================================"

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не найден. Установите Docker Desktop"
    exit 1
fi

echo "✅ Docker найден"

# Билд и запуск контейнеров
echo ""
echo "📦 Сборка контейнера Whisper..."
docker compose build

echo ""
echo "🚀 Запуск сервиса..."
docker compose up -d
docker compose exec ollama sh -c 'ollama pull "$QWEN_MODEL"'


echo ""
echo "⏳ Ожидание запуска Whisper (30 сек)..."
echo "   (Первый запуск может занять больше времени - Whisper скачивает модель ~145MB)"
sleep 30

echo ""
echo "✅ Установка завершена!"
echo ""
echo "📝 Статус сервиса:"
docker compose ps

echo ""
echo "🌐 API доступен на: http://localhost:8000"
echo "🔍 Проверка: http://localhost:8000/api/health"
echo ""
echo "📊 Логи: docker compose logs -f backend"
echo ""
echo "🛑 Остановка: docker compose down"
