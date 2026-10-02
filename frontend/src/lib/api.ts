// Клиент для backend API (backend/api/server.py)

export type Health = {
  status: string;
  models: {
    whisper: 'loaded' | 'not_loaded';
    qwen: 'ready' | 'model_missing' | 'unavailable';
  };
};

export type TranscribeResult = {
  text: string;
  language: string;
  language_probability: number;
};

export type AnswerResult = {
  answer: string;
  model: string;
};

export class ApiError extends Error {}

function errorDetail(data: unknown): string | null {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((d) => d?.msg).filter(Boolean).join('; ');
  return null;
}

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/+$/, '')}${path}`, init);
  } catch {
    throw new ApiError(`Backend недоступен (${base}). Запустите сервер.`);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(errorDetail(data) ?? `Ошибка сервера: ${response.status}`);
  }
  return data as T;
}

export function getHealth(base: string) {
  return request<Health>(base, '/api/health');
}

export function transcribe(base: string, audio: Blob) {
  const body = new FormData();
  body.append('audio', audio, 'recording.webm');
  return request<TranscribeResult>(base, '/api/transcribe', { method: 'POST', body });
}

export function generateAnswer(base: string, text: string, context: string, language: string) {
  return request<AnswerResult>(base, '/api/generate-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, context, language }),
  });
}
