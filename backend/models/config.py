"""Application configuration from the project .env and process environment."""
import os
from dotenv import load_dotenv

load_dotenv()

WHISPER_MODEL = os.environ["WHISPER_MODEL"]
WHISPER_DEVICE = os.environ["WHISPER_DEVICE"]
WHISPER_COMPUTE_TYPE = os.environ["WHISPER_COMPUTE_TYPE"]
MAX_AUDIO_BYTES = int(os.environ["MAX_AUDIO_BYTES"])

OLLAMA_BASE_URL = os.environ["OLLAMA_BASE_URL"].rstrip("/")
QWEN_MODEL = os.environ["QWEN_MODEL"]
QWEN_TIMEOUT = float(os.environ["QWEN_TIMEOUT"])
EMBEDDING_MODEL = os.environ["EMBEDDING_MODEL"]
EMBEDDING_TIMEOUT = float(os.environ["EMBEDDING_TIMEOUT"])
RAG_CHUNK_SIZE = int(os.environ["RAG_CHUNK_SIZE"])
RAG_TOP_K = int(os.environ["RAG_TOP_K"])
