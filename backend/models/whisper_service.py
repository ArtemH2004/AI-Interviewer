"""
Whisper STT (Speech-to-Text) сервис
"""
from faster_whisper import WhisperModel
import os
import tempfile
from pathlib import Path

class WhisperService:
    def __init__(self, model_size="medium", device="cpu", compute_type="int8"):
        """
        Инициализация Whisper модели

        Args:
            model_size: tiny, base, small, medium, large-v3
            device: cpu или cuda
            compute_type: int8, float16, float32
        """
        print(f"Загрузка Whisper модели: {model_size}")
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=None  # Автоматически в ~/.cache/huggingface
        )
        print("Whisper модель загружена успешно")

    def transcribe(self, audio_data: bytes, language: str = None) -> dict:
        """
        Транскрипция аудио в текст

        Args:
            audio_data: байты аудио файла (WAV, MP3, etc.)
            language: код языка ('ru', 'en') или None для автоопределения

        Returns:
            dict с полями:
                - text: распознанный текст
                - language: определённый язык
                - segments: детализированные сегменты
        """
        # Сохраняем аудио во временный файл
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(audio_data)
            tmp_path = tmp_file.name

        try:
            # Транскрибируем
            segments, info = self.model.transcribe(
                tmp_path,
                language=language,
                beam_size=5,
                vad_filter=True,  # Voice Activity Detection
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            # Собираем результат
            segments_list = []
            full_text = []

            for segment in segments:
                segments_list.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "confidence": segment.avg_logprob
                })
                full_text.append(segment.text)

            result = {
                "text": " ".join(full_text).strip(),
                "language": info.language,
                "language_probability": info.language_probability,
                "segments": segments_list
            }

            return result

        finally:
            # Удаляем временный файл
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


# Singleton instance
_whisper_service = None

def get_whisper_service() -> WhisperService:
    """Получить инстанс Whisper сервиса (singleton)"""
    global _whisper_service
    if _whisper_service is None:
        from .config import WHISPER_MODEL, WHISPER_DEVICE, WHISPER_COMPUTE_TYPE
        _whisper_service = WhisperService(
            model_size=WHISPER_MODEL,
            device=WHISPER_DEVICE,
            compute_type=WHISPER_COMPUTE_TYPE
        )
    return _whisper_service
