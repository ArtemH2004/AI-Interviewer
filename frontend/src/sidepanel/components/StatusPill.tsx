import type { Health } from '../../lib/api';
import { cx } from './ui';

type Props = { health: Health | null; offline: boolean };
type Status = 'ok' | 'warn' | 'error';

const DOT_COLORS: Record<Status, string> = {
  ok: 'bg-ios-green',
  warn: 'bg-ios-orange',
  error: 'bg-ios-red',
};

function StatusDot({ status, label }: { status: Status; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cx('size-1.5 rounded-full', DOT_COLORS[status])} />
      {label}
    </span>
  );
}

const QWEN_HINT: Record<Health['models']['qwen'], (model: string) => string> = {
  ready: (model) => `Qwen готов (${model})`,
  model_missing: (model) => `Модель Qwen не скачана: ollama pull ${model}`,
  unavailable: () => 'Ollama недоступна',
};

const QWEN_STATUS: Record<Health['models']['qwen'], Status> = {
  ready: 'ok',
  model_missing: 'warn',
  unavailable: 'error',
};

export function StatusPill({ health, offline }: Props) {
  if (offline || !health) {
    return (
      <span className="chip" title="Запустите backend">
        <StatusDot status={offline ? 'error' : 'warn'} label={offline ? 'Нет связи' : 'Проверка…'} />
      </span>
    );
  }
  const whisperOk = health.models.whisper === 'loaded';
  return (
    <span
      className="chip gap-3"
      title={`${whisperOk ? 'Whisper загружен' : 'Whisper не загружен'}\n${QWEN_HINT[health.models.qwen](health.qwen_model)}`}
    >
      <StatusDot status={whisperOk ? 'ok' : 'error'} label="Whisper" />
      <StatusDot status={QWEN_STATUS[health.models.qwen]} label="Qwen" />
    </span>
  );
}
