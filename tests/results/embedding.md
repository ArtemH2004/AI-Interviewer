# Embedding `qwen3-embedding:0.6b`

Тестов: 15, ошибок: 0, пропущено: 0, время: 3.6 с

| Тест | Результат |
|---|---|
| `EmbeddingServiceTests.test_embed_contract` | ✅ ok |
| `EmbeddingServiceTests.test_embed_empty_input_skips_request` | ✅ ok |
| `EmbeddingServiceTests.test_embed_failures` | ✅ ok |
| `EmbeddingServiceTests.test_health` | ✅ ok |
| `EmbeddingServiceTests.test_network_failures` | ✅ ok |
| `EmbeddingServiceTests.test_retrieve_keeps_original_order` | ✅ ok |
| `EmbeddingServiceTests.test_retrieve_picks_most_similar_chunk` | ✅ ok |
| `EmbeddingServiceTests.test_select_context_falls_back_to_full_context` | ✅ ok |
| `EmbeddingServiceTests.test_short_context_is_not_embedded` | ✅ ok |
| `HelperTests.test_chunk_text` | ✅ ok |
| `HelperTests.test_cosine_similarity` | ✅ ok |
| `LiveEmbeddingTests.test_retrieve_finds_relevant_chunk` | ✅ ok |
| `LiveEmbeddingTests.test_similar_texts_are_closer` | ✅ ok |
| `LiveEmbeddingTests.test_vectors_shape` | ✅ ok |
| `RagApiTests.test_answer_uses_retrieved_context` | ✅ ok |

## Retrieval (RAG)

Вопрос: _Что такое индекс в базе данных?_

Контекст кандидата:

- Пишу веб-сервисы на Python и Django.
- Оптимизировал SQL-запросы и настраивал индексы в PostgreSQL.
- По выходным хожу в походы в горы.

**Выбранный кусок (top_k=1):**

> Оптимизировал SQL-запросы и настраивал индексы в PostgreSQL.

## Косинусное сходство

Вопрос: _Что такое индекс в базе данных?_

| Текст | Сходство |
|---|---|
| Оптимизировал SQL-запросы и настраивал индексы в PostgreSQL. | **0.408** |
| По выходным хожу в походы в горы. | 0.149 |

## Размерность векторов

Запрос: `первый текст`, `второй текст`

Размерность: **1024**, время ответа: 0.92 с (CPU)

Начало вектора: `[-0.0081, -0.0658, -0.0132, -0.0478, 0.0067] ...`
