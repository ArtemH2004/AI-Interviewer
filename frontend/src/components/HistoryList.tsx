import { Trash2 } from 'lucide-react';
import type { HistoryItem } from '../services/storage';
import { Button, Section } from './ui';

type Props = {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
};

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', year: 'numeric' });

function formatHistoryDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toDateString() === new Date().toDateString() ? timeFormat.format(date) : dateFormat.format(date);
}

export function HistoryList({ items, onSelect, onClear }: Props) {
  if (items.length === 0) return null;
  return (
    <Section
        title="История"
        actions={
          <Button variant="danger" onClick={onClear}>
            <Trash2 className="size-4" /> Очистить
          </Button>
        }
      >
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full min-w-0 items-center gap-3 rounded-field px-3 py-3 text-left transition-colors duration-200 hover:bg-hover focus-visible:bg-hover"
              onClick={() => onSelect(item)}
            >
              <span className="line-clamp-2 min-w-0 flex-1 break-words text-callout">{item.question}</span>
              <time className="hint shrink-0 tabular-nums" dateTime={new Date(item.at).toISOString()}>{formatHistoryDate(item.at)}</time>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}
