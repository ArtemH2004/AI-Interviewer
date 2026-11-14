"""Live Whisper checks against the running backend."""
import unittest
from pathlib import Path

import httpx
from test_qwen import API_URL

AUDIO_FILES = [Path(__file__).parent / 'test_audio.wav']


class WhisperIntegrationTests(unittest.TestCase):
    def test_transcription(self):
        self.report_lines = []
        with httpx.Client(base_url=API_URL, timeout=300) as client:
            health = client.get('/api/health')
            health.raise_for_status()
            self.assertEqual(health.json()['models']['whisper'], 'loaded')
            self.report_lines += [f"Модель: `{health.json()['whisper_model']}`", '']
            for audio in AUDIO_FILES:
                with self.subTest(audio=audio.name):
                    with audio.open('rb') as sample:
                        response = client.post('/api/transcribe', files={'audio': (audio.name, sample, 'audio/wav')})
                    response.raise_for_status()
                    data = response.json()
                    self.report_lines += [f'## Аудио: `{audio.name}`', '',
                                          f"Язык: {data.get('language')}", '',
                                          f"> {data.get('text', '')}", '']
                    self.assertTrue(data.get('success'), data)
                    self.assertIsInstance(data.get('text'), str)
                    self.assertTrue(data['text'].strip(), 'Whisper returned an empty transcription')


if __name__ == '__main__':
    unittest.main(verbosity=2)
