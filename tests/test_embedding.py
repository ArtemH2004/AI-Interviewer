"""Embedding/RAG tests.

Offline tests replace Ollama with httpx.MockTransport. LiveEmbeddingTests call the real
model and are skipped if Ollama is not reachable:

    docker compose up -d
    python -m unittest tests.test_embedding -v

Run as a script to also save the report to tests/results/embedding.md:

    python tests/test_embedding.py
"""
import json
import sys
import time
import types
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # project root, for `python tests/test_embedding.py`
# Avoid importing the native STT runtime; no Whisper model is loaded in these tests.
sys.modules.setdefault('faster_whisper', types.SimpleNamespace(WhisperModel=object))
from backend.models.config import EMBEDDING_MODEL, OLLAMA_BASE_URL
from backend.models.embedding_service import (
    EmbeddingService, EmbeddingServiceError, chunk_text, cosine_similarity,
)
from backend.api import server

REAL_CLIENT = httpx.AsyncClient

# Fake embedding model: each text maps to a fixed 3D vector by its topic keyword.
TOPICS = {'python': [1.0, 0.0, 0.0], 'sql': [0.0, 1.0, 0.0], 'docker': [0.0, 0.0, 1.0]}


def fake_vector(text):
    text = text.lower()
    return next((vector for word, vector in TOPICS.items() if word in text), [0.1, 0.1, 0.1])


def client_factory(handler):
    return lambda **kwargs: REAL_CLIENT(transport=httpx.MockTransport(handler), **kwargs)


def embed_handler(request):
    texts = json.loads(request.content)['input']
    return httpx.Response(200, json={'embeddings': [fake_vector(text) for text in texts]})


class HelperTests(unittest.TestCase):
    def test_cosine_similarity(self):
        self.assertAlmostEqual(cosine_similarity([1, 2, 3], [2, 4, 6]), 1.0)
        self.assertAlmostEqual(cosine_similarity([1, 0], [0, 1]), 0.0)
        self.assertAlmostEqual(cosine_similarity([1, 0], [-1, 0]), -1.0)
        self.assertEqual(cosine_similarity([0, 0], [1, 1]), 0.0)
        with self.assertRaises(ValueError):
            cosine_similarity([1, 2], [1, 2, 3])

    def test_chunk_text(self):
        self.assertEqual(chunk_text(''), [])
        self.assertEqual(chunk_text('One. Two.\nThree!', chunk_size=100), ['One. Two. Three!'])
        chunks = chunk_text('First sentence. Second sentence. Third sentence.', chunk_size=20)
        self.assertEqual(chunks, ['First sentence.', 'Second sentence.', 'Third sentence.'])
        self.assertEqual(chunk_text('abcdefgh', chunk_size=3), ['abc', 'def', 'gh'])
        self.assertEqual(chunk_text('one two three four', chunk_size=9), ['one two', 'three', 'four'])


class EmbeddingServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_embed_contract(self):
        def handler(request):
            self.assertEqual(request.url.path, '/api/embed')
            payload = json.loads(request.content)
            self.assertEqual(payload['model'], EMBEDDING_MODEL)
            self.assertEqual(payload['input'], ['Python', 'SQL'])
            return embed_handler(request)

        with patch('httpx.AsyncClient', client_factory(handler)):
            vectors = await EmbeddingService().embed(['Python', 'SQL'])
        self.assertEqual(vectors, [TOPICS['python'], TOPICS['sql']])

    async def test_embed_empty_input_skips_request(self):
        def handler(request):
            self.fail('Ollama must not be called for empty input')
        with patch('httpx.AsyncClient', client_factory(handler)):
            self.assertEqual(await EmbeddingService().embed([]), [])

    async def test_embed_failures(self):
        for response, expected in [
            (httpx.Response(404), 503), (httpx.Response(500), 502),
            (httpx.Response(200, json={'embeddings': []}), 502),
            (httpx.Response(200, json={'embeddings': [['invalid']]}), 502),
            (httpx.Response(200, text='invalid json'), 502),
        ]:
            with self.subTest(status=response.status_code, body=response.content):
                with patch('httpx.AsyncClient', client_factory(lambda request: response)):
                    with self.assertRaises(EmbeddingServiceError) as caught:
                        await EmbeddingService().embed(['text'])
                self.assertEqual(caught.exception.status_code, expected)

    async def test_network_failures(self):
        for error, expected in [(httpx.ConnectError('offline'), 503), (httpx.ReadTimeout('slow'), 504)]:
            def handler(request):
                raise error
            with patch('httpx.AsyncClient', client_factory(handler)):
                with self.assertRaises(EmbeddingServiceError) as caught:
                    await EmbeddingService().embed(['text'])
            self.assertEqual(caught.exception.status_code, expected)

    async def test_retrieve_picks_most_similar_chunk(self):
        context = 'I wrote Python services.\nI tuned SQL queries.\nI built Docker images.'
        with patch('httpx.AsyncClient', client_factory(embed_handler)):
            result = await EmbeddingService().retrieve('Tell me about SQL indexes', context, top_k=1, chunk_size=30)
        self.assertEqual(result, ['I tuned SQL queries.'])

    async def test_retrieve_keeps_original_order(self):
        # Similarity to "Python": Python chunk 1.0 > hiking 0.58 > Docker 0.0, but output follows the text order.
        context = 'I like hiking.\nI built Docker images.\nI wrote Python services.'
        with patch('httpx.AsyncClient', client_factory(embed_handler)):
            result = await EmbeddingService().retrieve('Python?', context, top_k=2, chunk_size=30)
        self.assertEqual(result, ['I like hiking.', 'I wrote Python services.'])

    async def test_short_context_is_not_embedded(self):
        def handler(request):
            self.fail('Context that fits into top_k must not be embedded')
        with patch('httpx.AsyncClient', client_factory(handler)):
            self.assertEqual(await EmbeddingService().select_context('Q', 'Python developer.'), 'Python developer.')
            self.assertEqual(await EmbeddingService().select_context('Q', ''), '')

    async def test_select_context_surfaces_embedding_failure(self):
        context = '\n'.join(f'Fact {i}: ' + 'detail ' * 80 for i in range(5))  # 5 chunks > RAG_TOP_K
        with patch('httpx.AsyncClient', client_factory(lambda request: httpx.Response(500))):
            with self.assertRaises(EmbeddingServiceError):
                await EmbeddingService().select_context('Q', context)

    async def test_health(self):
        for models, expected in [([{'name': EMBEDDING_MODEL}], 'ready'), ([], 'model_missing')]:
            with patch('httpx.AsyncClient', client_factory(lambda request: httpx.Response(200, json={'models': models}))):
                self.assertEqual(await EmbeddingService().health(), expected)
        with patch('httpx.AsyncClient', client_factory(lambda request: httpx.Response(500))):
            self.assertEqual(await EmbeddingService().health(), 'unavailable')


class RagApiTests(unittest.TestCase):
    def test_answer_uses_retrieved_context(self):
        client = TestClient(server.app)
        answer = {'success': True, 'answer': 'Answer', 'model': 'qwen'}
        with patch.object(server.embedding_service, 'select_context', AsyncMock(return_value='Relevant chunk')) as select, \
                patch.object(server.qwen_service, 'generate_answer', AsyncMock(return_value=answer)) as generate:
            response = client.post('/api/generate-answer', json={'text': 'Question', 'context': 'Long context'})
        self.assertEqual(response.status_code, 200)
        select.assert_awaited_once_with('Question', 'Long context')
        generate.assert_awaited_once_with('Question', 'ru', 'Relevant chunk')

    def test_embedding_error_is_returned_to_client(self):
        client = TestClient(server.app)
        with patch.object(server.embedding_service, 'select_context', AsyncMock(side_effect=EmbeddingServiceError(503, 'Unavailable'))):
            response = client.post('/api/generate-answer', json={'text': 'Question', 'context': 'Context'})
        self.assertEqual(response.status_code, 503)


def model_available() -> bool:
    try:
        models = httpx.get(f'{OLLAMA_BASE_URL}/api/tags', timeout=3).json()['models']
        return any(model['name'] == EMBEDDING_MODEL for model in models)
    except (httpx.HTTPError, ValueError, KeyError):
        return False


# Live examples collected for the report: (title, lines).
LIVE_EXAMPLES = []


@unittest.skipUnless(model_available(), f'Ollama with {EMBEDDING_MODEL} is not reachable at {OLLAMA_BASE_URL}')
class LiveEmbeddingTests(unittest.IsolatedAsyncioTestCase):
    async def test_vectors_shape(self):
        started = time.perf_counter()
        vectors = await EmbeddingService().embed(['первый текст', 'второй текст'])
        elapsed = time.perf_counter() - started
        self.assertEqual(len(vectors), 2)
        self.assertEqual(len(vectors[0]), len(vectors[1]))
        self.assertGreater(len(vectors[0]), 0)
        LIVE_EXAMPLES.append(('Размерность векторов', [
            'Запрос: `первый текст`, `второй текст`', '',
            f'Размерность: **{len(vectors[0])}**, время ответа: {elapsed:.2f} с (CPU)', '',
            f'Начало вектора: `{[round(x, 4) for x in vectors[0][:5]]} ...`',
        ]))

    async def test_similar_texts_are_closer(self):
        texts = [
            'Что такое индекс в базе данных?',
            'Оптимизировал SQL-запросы и настраивал индексы в PostgreSQL.',
            'По выходным хожу в походы в горы.',
        ]
        query, related, unrelated = await EmbeddingService().embed(texts)
        related_score, unrelated_score = cosine_similarity(query, related), cosine_similarity(query, unrelated)
        self.assertGreater(related_score, unrelated_score)
        LIVE_EXAMPLES.append(('Косинусное сходство', [
            f'Вопрос: _{texts[0]}_', '',
            '| Текст | Сходство |', '|---|---|',
            f'| {texts[1]} | **{related_score:.3f}** |',
            f'| {texts[2]} | {unrelated_score:.3f} |',
        ]))

    async def test_retrieve_finds_relevant_chunk(self):
        question = 'Что такое индекс в базе данных?'
        context = ('Пишу веб-сервисы на Python и Django.\n'
                   'Оптимизировал SQL-запросы и настраивал индексы в PostgreSQL.\n'
                   'По выходным хожу в походы в горы.')
        result = await EmbeddingService().retrieve(question, context, top_k=1, chunk_size=80)
        self.assertEqual(result, ['Оптимизировал SQL-запросы и настраивал индексы в PostgreSQL.'])
        LIVE_EXAMPLES.append(('Retrieval (RAG)', [
            f'Вопрос: _{question}_', '', 'Контекст кандидата:', '',
            *[f'- {line}' for line in context.splitlines()], '',
            '**Выбранный кусок (top_k=1):**', '', f'> {result[0]}',
        ]))


class ReportResult(unittest.TextTestResult):
    """Remembers the outcome of every test for the markdown report."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.outcomes = []

    def addSuccess(self, test):
        super().addSuccess(test)
        self.outcomes.append((test, '✅ ok'))

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.outcomes.append((test, '❌ fail'))

    def addError(self, test, err):
        super().addError(test, err)
        self.outcomes.append((test, '❌ error'))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        self.outcomes.append((test, f'⏭ skipped: {reason}'))


def write_report(result, elapsed):
    lines = [f'# Embedding `{EMBEDDING_MODEL}`', '',
             f'Тестов: {result.testsRun}, ошибок: {len(result.failures) + len(result.errors)}, '
             f'пропущено: {len(result.skipped)}, время: {elapsed:.1f} с', '',
             '| Тест | Результат |', '|---|---|']
    lines += [f'| `{type(test).__name__}.{test._testMethodName}` | {status} |' for test, status in result.outcomes]
    for title, example in LIVE_EXAMPLES:
        lines += ['', f'## {title}', '', *example]
    path = Path(__file__).parent / 'results' / 'embedding.md'
    path.parent.mkdir(exist_ok=True)
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'Отчёт: {path}')


if __name__ == '__main__':
    suite = unittest.defaultTestLoader.loadTestsFromModule(sys.modules[__name__])
    started = time.perf_counter()
    result = unittest.TextTestRunner(resultclass=ReportResult, verbosity=2).run(suite)
    write_report(result, time.perf_counter() - started)
    sys.exit(not result.wasSuccessful())
