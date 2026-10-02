"""Offline contract tests: no model downloads or running Ollama required."""
import sys
import types
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

# Avoid importing the native STT runtime; no Whisper model is loaded in these tests.
sys.modules.setdefault('faster_whisper', types.SimpleNamespace(WhisperModel=object))
from backend.models.config import QWEN_MODEL
from backend.models.qwen_service import QwenService, QwenServiceError
from backend.api import server

REAL_CLIENT = httpx.AsyncClient


def client_factory(handler):
    return lambda **kwargs: REAL_CLIENT(transport=httpx.MockTransport(handler), **kwargs)


class QwenTests(unittest.IsolatedAsyncioTestCase):
    async def test_chat_contract(self):
        import json

        def handler(request):
            self.assertEqual(request.url.path, '/api/chat')
            payload = json.loads(request.content)
            self.assertEqual(payload['model'], QWEN_MODEL)
            self.assertFalse(payload['stream'])
            self.assertFalse(payload['think'])
            self.assertIn('en', payload['messages'][0]['content'])
            self.assertIn('Python developer', payload['messages'][1]['content'])
            self.assertIn('What is a generator?', payload['messages'][1]['content'])
            return httpx.Response(200, json={'message': {'content': ' A generator yields values. '}})

        with patch('httpx.AsyncClient', client_factory(handler)):
            result = await QwenService().generate_answer('What is a generator?', 'Python developer', 'en')
        self.assertEqual(result['answer'], 'A generator yields values.')

    async def test_failures(self):
        for response, expected in [
            (httpx.Response(404), 503), (httpx.Response(500), 502),
            (httpx.Response(200, json={'message': {'content': ''}}), 502),
            (httpx.Response(200, text='invalid json'), 502),
        ]:
            with self.subTest(status=response.status_code):
                with patch('httpx.AsyncClient', client_factory(lambda request: response)):
                    with self.assertRaises(QwenServiceError) as caught:
                        await QwenService().generate_answer('Question', '', 'ru')
                self.assertEqual(caught.exception.status_code, expected)

    async def test_network_failures(self):
        for error, expected in [(httpx.ConnectError('offline'), 503), (httpx.ReadTimeout('slow'), 504)]:
            def handler(request):
                raise error
            with patch('httpx.AsyncClient', client_factory(handler)):
                with self.assertRaises(QwenServiceError) as caught:
                    await QwenService().generate_answer('Question', '', 'ru')
            self.assertEqual(caught.exception.status_code, expected)

    async def test_health(self):
        for models, expected in [([{'name': QWEN_MODEL}], 'ready'), ([], 'model_missing')]:
            with patch('httpx.AsyncClient', client_factory(lambda request: httpx.Response(200, json={'models': models}))):
                self.assertEqual(await QwenService().health(), expected)
        with patch('httpx.AsyncClient', client_factory(lambda request: httpx.Response(500))):
            self.assertEqual(await QwenService().health(), 'unavailable')


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(server.app)  # Not used as a context manager: lifespan (Whisper loading) does not run.

    def test_question_validation(self):
        for payload in [{'text': ''}, {'text': '   '}, {'text': 'Q', 'language': ''}]:
            self.assertEqual(self.client.post('/api/generate-answer', json=payload).status_code, 422)

    def test_answer_and_errors(self):
        from unittest.mock import AsyncMock
        with patch.object(server.qwen_service, 'generate_answer', AsyncMock(return_value={'success': True, 'answer': 'Answer', 'model': QWEN_MODEL})) as generate:
            response = self.client.post('/api/generate-answer', json={'text': ' Question '})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['answer'], 'Answer')
            generate.assert_awaited_once_with('Question', '', 'ru')
        with patch.object(server.qwen_service, 'generate_answer', AsyncMock(side_effect=server.QwenServiceError(503, 'Ollama unavailable'))):
            self.assertEqual(self.client.post('/api/generate-answer', json={'text': 'Q'}).status_code, 503)

    def test_transcription_still_uses_whisper(self):
        from unittest.mock import Mock
        result = {'text': 'Question', 'language': 'en', 'language_probability': 0.99, 'segments': []}
        whisper = Mock()
        whisper.transcribe.return_value = result
        with patch.object(server, 'whisper_service', whisper):
            response = self.client.post('/api/transcribe', files={'audio': ('sample.wav', b'audio', 'audio/wav')})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['text'], 'Question')
        whisper.transcribe.assert_called_once_with(b'audio')
        with patch.object(server, 'whisper_service', whisper):
            response = self.client.post('/api/transcribe', files={'audio': ('empty.wav', b'', 'audio/wav')})
        self.assertEqual(response.status_code, 400)


if __name__ == '__main__':
    unittest.main()
