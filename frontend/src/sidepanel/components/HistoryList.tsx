import { Trash2 } from 'lucide-react';
import type { HistoryItem } from '../../lib/storage';
import { SectionHeader } from './ui';

type Props = {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
};

const timeFormat = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' });

export function HistoryList({ items, onSelect, onClear }: Props) {
  if (items.length === 0) return null;
  return (
    <section>
      {/* px-4 — выравниваем заголовок по тексту строк списка */}
      <SectionHeader
        className="px-4"
        title="История"
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-footnote text-fg-muted transition-colors hover:text-ios-red"
            onClick={onClear}
          >
            <Trash2 className="size-3.5" /> Очистить
          </button>
        }
      />
      <ul className="glass divide-y divide-hairline overflow-hidden rounded-card">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-hover active:bg-hover"
              onClick={() => onSelect(item)}
            >
              <span className="line-clamp-2 flex-1 text-callout">{item.question}</span>
              <span className="hint shrink-0 tabular-nums">{timeFormat.format(item.at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
