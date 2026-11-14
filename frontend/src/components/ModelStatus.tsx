import { useEffect, useState } from 'react';
import { getHealth, type Health } from '../services/api';

type Status = { state: 'checking' } | { state: 'offline' } | { state: 'online'; health: Health };
type IndicatorProps = { label: string; ready: boolean; available: string; unavailable: string };

const CHECK_INTERVAL_MS = 15000;
const CHECK_TIMEOUT_MS = 8000;

function Indicator({ label, ready, available, unavailable }: IndicatorProps) {
  return (
    <span className="model-indicator">
      <span className={ready ? 'model-dot model-dot-ready' : 'model-dot model-dot-error'} aria-hidden="true" />
      <span>{label}: {ready ? available : unavailable}</span>
    </span>
  );
}

export function ModelStatus({ apiBase }: { apiBase: string }) {
  const [status, setStatus] = useState<Status>({ state: 'checking' });

  useEffect(() => {
    let active = true;
    let nextCheck: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    setStatus({ state: 'checking' });

    const check = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), CHECK_TIMEOUT_MS);
      try {
        const health = await getHealth(apiBase, controller.signal);
        if (active) setStatus({ state: 'online', health });
      } catch {
        if (active) setStatus({ state: 'offline' });
      } finally {
        clearTimeout(timeout);
        if (active) nextCheck = setTimeout(check, CHECK_INTERVAL_MS);
      }
    };

    void check();
    return () => {
      active = false;
      clearTimeout(nextCheck);
      controller?.abort();
    };
  }, [apiBase]);

  if (status.state === 'checking') {
    return <p className="model-status-message" role="status">Проверяем подключение…</p>;
  }

  if (status.state === 'offline') {
    return <p className="model-status-message" role="status"><span className="model-dot model-dot-error" aria-hidden="true" />Сервер недоступен</p>;
  }

  const { health } = status;
  const whisperReady = health.models.whisper === 'loaded';
  const qwenReady = health.models.qwen === 'ready';
  const embeddingReady = health.models.embedding === 'ready';
  const issues = [
    !whisperReady && 'Модель распознавания речи не загружена.',
    health.models.qwen === 'model_missing' && 'Модель для ответов не скачана.',
    health.models.qwen === 'unavailable' && 'Сервис ответов недоступен.',
    health.models.embedding === 'model_missing' && 'Модель поиска по опыту не скачана.',
    health.models.embedding === 'unavailable' && 'Сервис поиска по опыту недоступен.',
  ].filter(Boolean);

  return (
    <div role="status" className="model-status">
      <div className="model-status-indicators">
        <Indicator label="Речь" ready={whisperReady} available="готова" unavailable="недоступна" />
        <Indicator label="Ответы" ready={qwenReady} available="готовы" unavailable="недоступны" />
        <Indicator label="Поиск" ready={embeddingReady} available="готов" unavailable="недоступен" />
      </div>
      {issues.length > 0 && <p className="model-status-detail">{issues.join(' ')}</p>}
    </div>
  );
}
