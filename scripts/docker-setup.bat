@echo off
echo AI Interview Assistant - Whisper Docker Setup
echo ================================================

REM Проверка Docker
where docker >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo X Docker не найден. Установите Docker Desktop
    exit /b 1
)
echo + Docker найден

echo.
echo Сборка контейнера Whisper...
docker compose build

echo.
echo Запуск сервиса...
docker compose up -d
docker compose exec ollama sh -c "ollama pull $QWEN_MODEL"


echo.
echo Ожидание запуска Whisper (30 сек)...
echo (Первый запуск может занять больше времени - Whisper скачивает модель ~145MB)
timeout /t 30 /nobreak

echo.
echo + Установка завершена!
echo.
echo Статус сервиса:
docker compose ps

echo.
echo API доступен на: http://localhost:8000
echo Проверка: http://localhost:8000/api/health
echo.
echo Логи: docker compose logs -f backend
echo.
echo Остановка: docker compose down
