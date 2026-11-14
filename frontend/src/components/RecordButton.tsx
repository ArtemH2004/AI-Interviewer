import { Mic, Square } from 'lucide-react';
import { Button } from './ui';

type Props = { recording: boolean; disabled?: boolean; level: number; onClick: () => void };

export function RecordButton({ recording, disabled, level, onClick }: Props) {
  return (
    <div className="flex w-full flex-col gap-3">
      <Button variant="primary" className="w-full" disabled={disabled} onClick={onClick} aria-pressed={recording}>
        {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
        {recording ? 'Остановить запись' : 'Записать вопрос'}
      </Button>
      {recording && (
        <div className="h-1 overflow-hidden rounded-full bg-hover" role="meter" aria-label="Уровень звука" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
          <div className="h-full bg-fg-muted" style={{ width: `${Math.max(2, level * 100)}%` }} />
        </div>
      )}
    </div>
  );
}
