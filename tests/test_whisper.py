"""
Тест Whisper API в Docker контейнере
"""
import requests
import json
from pathlib import Path

API_URL = "http://localhost:8000"


def test_health():
    """Проверка health endpoint"""
    print("🔍 Проверка health endpoint...")
    try:
        response = requests.get(f"{API_URL}/api/health", timeout=5)
        response.raise_for_status()
        data = response.json()
        print(f"✅ Health check passed: {json.dumps(data, indent=2, ensure_ascii=False)}")
        return data.get("models", {}).get("whisper") == "loaded"
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False


def test_transcribe_with_sample():
    """Тест транскрипции с тестовым аудио файлом"""
    print("\n🎤 Тест транскрипции...")

    # Путь к тестовому аудио файлу
    test_audio = Path(__file__).parent / "test_audio.wav"

    if not test_audio.exists():
        print(f"⚠️  Тестовый аудио файл не найден: {test_audio}")
        print("   Положите файл test_audio.wav в папку tests/ для полного теста")
        return False

    try:
        with open(test_audio, "rb") as f:
            # Поле формы должно называться "audio" — см. backend/api/server.py
            files = {"audio": ("test_audio.wav", f, "audio/wav")}
            response = requests.post(
                f"{API_URL}/api/transcribe",
                files=files,
                timeout=60
            )

        response.raise_for_status()
        data = response.json()

        print(f"✅ Транскрипция успешна!")
        print(f"   Текст: {data.get('text', 'N/A')}")
        print(f"   Язык: {data.get('language', 'N/A')} (p={data.get('language_probability', 'N/A')})")
        print(f"   Сегментов: {len(data.get('segments', []))}")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка транскрипции: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"   Response: {e.response.text}")
        return False


def main():
    print("=" * 60)
    print("🐳 Тестирование Whisper в Docker")
    print("=" * 60)

    # Проверка health
    if not test_health():
        print("\n❌ API недоступен или модель не загружена. Убедитесь что Docker контейнер запущен:")
        print("   docker compose up -d")
        print("   docker compose logs -f backend")
        return

    # Тест транскрипции
    test_transcribe_with_sample()

    print("\n" + "=" * 60)
    print("✅ Тестирование завершено")
    print("=" * 60)


if __name__ == "__main__":
    main()
