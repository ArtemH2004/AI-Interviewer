"""
Whisper STT (Speech-to-Text) сервис
"""
import io

from faster_whisper import WhisperModel


class WhisperService:
    def __init__(self, model_size, device, compute_type):
        """
        Инициализация Whisper модели

        Args:
            model_size: tiny, base, small, medium, large-v3
            device: cpu, cuda или auto
            compute_type: int8, float16, float32 или default
        """
        print(f"Загрузка Whisper модели: {model_size} ({device}, {compute_type})")
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
        )
        print("Whisper модель загружена успешно")

    def transcribe(self, audio_data: bytes, language: str = None) -> dict:
        """
        Транскрипция аудио в текст

        Args:
            audio_data: байты аудио файла (WAV, WebM, MP3 и т.д. — формат определяется по содержимому)
            language: код языка ('ru', 'en') или None для автоопределения

        Returns:
            dict с полями:
                - text: распознанный текст
                - language: определённый язык
        """
        segments, info = self.model.transcribe(
            io.BytesIO(audio_data),
            language=language,
            beam_size=5,
            vad_filter=True,  # Voice Activity Detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # segments — генератор: распознавание идёт по мере итерации
        return {
            "text": "".join(segment.text for segment in segments).strip(),
            "language": info.language,
        }
