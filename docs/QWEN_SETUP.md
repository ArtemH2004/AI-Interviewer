# Qwen integration: setup and rationale

Qwen generates answers from **text**. Whisper remains the speech-to-text model, with `base`, CPU and `int8` defaults.

## Local setup (recommended on macOS)

Run these commands from the repository root. Use Python 3.11, matching the Docker image.

1. Install the current Ollama app from https://ollama.com/download and launch it. On Linux, use Ollama's installer. If you use the CLI instead of the app, run `ollama serve` in a separate terminal. Do not start a second server if the app already serves port 11434.
2. Download the answer model:

   ```bash
   ollama pull qwen3:1.7b
   ```

3. Create an environment, install dependencies, and start the backend:

   ```bash
   python3.11 -m venv .venv
   source .venv/bin/activate
   python -m pip install -r backend/requirements.txt
   python backend/api/server.py
   ```

   The first backend start still downloads Whisper if it is not cached. Wait for startup to complete.
4. In another terminal, verify the models:

   ```bash
   curl http://localhost:8000/api/health
   ```

   Expect `models.whisper` to be `loaded` and `models.qwen` to be `ready`. Qwen readiness means the configured model is downloaded, not that it is already loaded into memory.
5. Request an answer:

   ```bash
   curl http://localhost:8000/api/generate-answer \
     -H 'Content-Type: application/json' \
     -d '{"text":"What is the difference between a list and a tuple in Python?","context":"Junior Python developer preparing for an interview.","language":"en"}'
   ```

   Response: `{"success":true,"answer":"...","model":"qwen3:1.7b"}`. Actual wording depends on the model.

## Docker setup

Run from the repository root:

```bash
docker compose up -d --build
docker compose exec ollama ollama pull qwen3:1.7b
docker compose logs -f backend
```

Then use the same health and answer commands above. `/api/health` also returns `qwen_model`, the configured model tag. The backend connects to `http://ollama:11434` over Docker's internal network. Model downloads persist in `ollama-cache`; Whisper keeps its existing separate cache. Ollama does not need a host port. The setup scripts now also pull Qwen.

On macOS, native Ollama is generally preferable for generation performance because the Linux Docker container does not use Apple Metal. The same applies to Windows without an NVIDIA GPU: native Ollama can use Intel/AMD GPUs through Vulkan (on by default in recent versions, `OLLAMA_VULKAN=1` in older ones; integrated Intel GPU support is still experimental), while Docker cannot. To use host Ollama with a Docker backend, set `OLLAMA_BASE_URL=http://host.docker.internal:11434` in the root `.env` and run `docker compose up -d backend`.

## Whisper to Qwen workflow

Whisper's endpoint still accepts an uploaded audio file:

```bash
curl http://localhost:8000/api/transcribe \
  -F 'audio=@tests/test_audio.wav'
```

Send its returned `text` as the `text` field of `/api/generate-answer`, and its `language` as the answer language. The endpoints remain separate so transcription and generation can be retried independently. The API does not automatically generate an answer when audio is uploaded.

The Chrome extension's side panel chains both calls itself: it records the microphone and/or tab audio, sends it to `/api/transcribe`, then (with auto-answer enabled) sends the transcript and detected language to `/api/generate-answer`. In text mode, the question goes straight to Qwen. The answer language follows the extension setting (`auto` uses Whisper's detected language).

## Configuration

| Environment variable | Default locally | Purpose |
| --- | --- | --- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server; Docker uses its service hostname |
| `QWEN_MODEL` | `qwen3:1.7b` | Exact Ollama model tag for answer generation |
| `QWEN_TIMEOUT` | `120` | Request timeout in seconds, allowing cold model loading |

In Docker, all of these can be overridden in the root `.env` file (Compose substitutes `${...}`).

The default `qwen3:1.7b` (~1.4 GB) is chosen for low-end CPUs. For better answers, use a larger Qwen model, e.g. locally:

```bash
ollama pull qwen3:4b
QWEN_MODEL=qwen3:4b python backend/api/server.py
```

For Docker, set it in the root `.env` (both the backend and the `ollama` container read it), then:

```bash
docker compose up -d
docker compose exec ollama sh -c 'ollama pull "$QWEN_MODEL"'
```

Restart the backend after changing configuration. Local configuration reads process environment variables; it does not automatically load a `.env` file. Compose reads its root `.env` for `${...}` substitution. These settings do not change Whisper.

## What changed and why

- `backend/models/qwen_service.py`: adds an asynchronous HTTP client for Ollama `/api/chat`. This uses the existing project's local Ollama approach without API keys or sending questions to a hosted provider. `stream: false` produces one JSON answer compatible with the popup. `think: false` requests direct answers rather than thinking output. The prompt asks for concise spoken answers, respects the requested language and context, and instructs Qwen not to invent personal experience. Prompt instructions cannot guarantee factual accuracy; review generated answers.
- `backend/models/config.py`: adds independent Ollama/Qwen settings so answer model size and timeout can change without touching transcription.
- `backend/api/server.py`: implements the previously unimplemented `/api/generate-answer`; rejects blank questions and bounds input sizes. It maps connection/missing-model errors to 503, timeouts to 504 and invalid/upstream failures to 502. `/api/health` adds Qwen availability while preserving the existing Whisper field. The top-level `healthy` value still indicates the API is running; inspect individual model statuses.
- `backend/requirements.txt`: adds `httpx` for nonblocking calls to Ollama, avoiding synchronous generation inside an async API route.
- `docker-compose.yml`: adds a local Ollama service and persistent model storage. Model download remains explicit, avoiding a large hidden download during API startup.
- `scripts/setup.sh` and Docker setup scripts: download Qwen instead of leaving the setup pointing at Llama.
- `chrome-extension/src/popup/` (now `frontend/`, rewritten as a side panel): replaced canned questions/answers with editable input and an actual generation request; surfaces API errors and marks unfinished recording honestly.
- `README.md` and `docs/ARCHITECTURE.md`: identify Qwen as the answer model and distinguish the implemented text workflow from planned audio capture.
- `tests/test_qwen.py`: verifies the Ollama request contract, validation, failures, health states and that transcription still calls Whisper. Tests mock model services; they do not download or execute models.

## Verification and troubleshooting

Integration checks completed: all seven offline tests passed; Python compilation, popup JavaScript syntax, Docker Compose configuration and `git diff --check` passed. A live model answer was not tested because Ollama is not installed in the development environment.

With backend dependencies installed:

```bash
python -m unittest discover -s tests -p 'test_qwen.py' -v
```

- `model_missing` or a 503 telling you to pull the model: download the exact configured tag, on the same Ollama server the backend uses.
- `unavailable` or a connection 503: start Ollama and check the server URL. `localhost` inside the backend container refers to that container, not the host or Ollama service.
- 504: cold startup or generation exceeded the configured timeout. Increase `QWEN_TIMEOUT`, choose a smaller Qwen model, or run native Ollama on macOS.
- 502: inspect Ollama logs and update Ollama if it does not support the configured model or the `think` parameter.
- Whisper `not_loaded`: inspect backend startup logs; this is separate from Qwen generation.

Official references: [Ollama chat API](https://docs.ollama.com/api/chat), [thinking control](https://ollama.com/blog/thinking), [Qwen 3 model tags](https://ollama.com/library/qwen3/tags).
