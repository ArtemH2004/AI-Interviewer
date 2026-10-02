"""
Whisper STT (Speech-to-Text) сервис
"""
import io

from faster_whisper import WhisperModel


class WhisperService:
    def __init__(self, model_size="base", device="cpu", compute_type="int8"):
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
                - language_probability: уверенность в языке (0..1)
                - segments: детализированные сегменты
        """
        segments, info = self.model.transcribe(
            io.BytesIO(audio_data),
            language=language,
            beam_size=5,
            vad_filter=True,  # Voice Activity Detection
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        # segments — генератор: распознавание идёт по мере итерации
        segments_list = [
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment.text,
                "avg_logprob": segment.avg_logprob,  # лог-вероятность (≤ 0), а не процент уверенности
            }
            for segment in segments
        ]

        return {
            "text": "".join(s["text"] for s in segments_list).strip(),
            "language": info.language,
            "language_probability": info.language_probability,
            "segments": segments_list
        }


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
            compute_type=WHISPER_COMPUTE_TYPE,
        )
    return _whisper_service
