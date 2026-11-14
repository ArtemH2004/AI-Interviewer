# Embedding

Тестов: 16; ошибок: 0; пропущено: 0; время: 8.7 с

## test_embed_contract (test_embedding.EmbeddingServiceTests.test_embed_contract)

Результат: OK


## test_embed_empty_input_skips_request (test_embedding.EmbeddingServiceTests.test_embed_empty_input_skips_request)

Результат: OK


## test_embed_failures (test_embedding.EmbeddingServiceTests.test_embed_failures)

Результат: OK


## test_health (test_embedding.EmbeddingServiceTests.test_health)

Результат: OK


## test_network_failures (test_embedding.EmbeddingServiceTests.test_network_failures)

Результат: OK


## test_retrieve_keeps_original_order (test_embedding.EmbeddingServiceTests.test_retrieve_keeps_original_order)

Результат: OK


## test_retrieve_picks_most_similar_chunk (test_embedding.EmbeddingServiceTests.test_retrieve_picks_most_similar_chunk)

Результат: OK


## test_select_context_surfaces_embedding_failure (test_embedding.EmbeddingServiceTests.test_select_context_surfaces_embedding_failure)

Результат: OK


## test_short_context_is_not_embedded (test_embedding.EmbeddingServiceTests.test_short_context_is_not_embedded)

Результат: OK


## test_chunk_text (test_embedding.HelperTests.test_chunk_text)

Результат: OK


## test_cosine_similarity (test_embedding.HelperTests.test_cosine_similarity)

Результат: OK


## test_retrieve_finds_relevant_chunk (test_embedding.LiveEmbeddingTests.test_retrieve_finds_relevant_chunk)

Результат: OK


## test_similar_texts_are_closer (test_embedding.LiveEmbeddingTests.test_similar_texts_are_closer)

Результат: OK


## test_vectors_shape (test_embedding.LiveEmbeddingTests.test_vectors_shape)

Результат: OK


## test_answer_uses_retrieved_context (test_embedding.RagApiTests.test_answer_uses_retrieved_context)

Результат: OK


## test_embedding_error_is_returned_to_client (test_embedding.RagApiTests.test_embedding_error_is_returned_to_client)

Результат: OK


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

Размерность: **1024**, время ответа: 0.75 с (CPU)

Начало вектора: `[-0.0081, -0.0658, -0.0132, -0.0478, 0.0067] ...`

