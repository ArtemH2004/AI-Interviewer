@echo off
rem Изолируем переменные и переходим в корень проекта.
setlocal
cd /d "%~dp0"

rem Выбор способа установки.
echo AI Interview Assistant setup
echo 1. Docker (recommended)
echo 2. Local Python and Ollama
choice /c 12 /n /m "Choose setup mode [1/2]: "
if errorlevel 2 goto local_setup
goto docker_setup

:prepare_env
rem Создаём настройки только если пользователь ещё не создал .env.
if not exist .env (
    copy .env.example .env >nul
    if errorlevel 1 exit /b 1
)
exit /b 0

:docker_setup
rem Проверяем Docker и подготавливаем настройки.
where docker >nul 2>&1
if errorlevel 1 (
    echo Docker not found. Install and start Docker Desktop.
    exit /b 1
)
call :prepare_env
if errorlevel 1 exit /b 1
rem Собираем и запускаем контейнеры, затем загружаем обе модели в Ollama.
docker compose up -d --build
if errorlevel 1 exit /b 1
docker compose exec -T ollama sh -c "ollama pull $QWEN_MODEL"
if errorlevel 1 exit /b 1
docker compose exec -T ollama sh -c "ollama pull $EMBEDDING_MODEL"
if errorlevel 1 exit /b 1
echo Setup complete. Whisper may still be downloading.
rem Показываем состояние контейнеров и команду просмотра логов.
docker compose ps
echo Logs: docker compose logs -f backend
exit /b 0

:local_setup
rem Проверяем наличие Python и Ollama в PATH.
where python >nul 2>&1
if errorlevel 1 (
    echo Python not found. Install Python and add it to PATH.
    exit /b 1
)
where ollama >nul 2>&1
if errorlevel 1 (
    echo Ollama not found. Install and start Ollama first.
    exit /b 1
)
call :prepare_env
if errorlevel 1 exit /b 1
rem Устанавливаем зависимости backend.
python -m pip install -r backend/requirements.txt
if errorlevel 1 exit /b 1
rem Читаем имена моделей с тем же приоритетом настроек, что и backend.
set "SETUP_QWEN_MODEL="
set "SETUP_EMBEDDING_MODEL="
for /f "delims=" %%i in ('python -c "from backend.models.config import QWEN_MODEL; print(QWEN_MODEL)"') do set "SETUP_QWEN_MODEL=%%i"
for /f "delims=" %%i in ('python -c "from backend.models.config import EMBEDDING_MODEL; print(EMBEDDING_MODEL)"') do set "SETUP_EMBEDDING_MODEL=%%i"
if not defined SETUP_QWEN_MODEL exit /b 1
if not defined SETUP_EMBEDDING_MODEL exit /b 1
rem Загружаем модели в локальную Ollama.
ollama pull "%SETUP_QWEN_MODEL%"
if errorlevel 1 exit /b 1
ollama pull "%SETUP_EMBEDDING_MODEL%"
if errorlevel 1 exit /b 1
rem Выводим команду запуска backend.
echo Setup complete. Start the backend from the project root:
echo python -m uvicorn backend.api.server:app --host 127.0.0.1 --port 8000
exit /b 0
