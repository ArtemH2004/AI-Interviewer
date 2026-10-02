import type { ReactNode } from 'react';
import { cx } from './ui';

type Option<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

// Размеры совпадают с кнопками: sm — 32px, md — 36px
const SIZES = {
  sm: 'h-8 text-footnote',
  md: 'h-9 text-callout',
};

// iOS-сегменты: стеклянная дорожка и «капля»-ползунок под активным пунктом
export function SegmentedControl<T extends string>({ value, options, onChange, disabled, size = 'md' }: Props<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      className={cx('glass grid rounded-full p-0.5', SIZES[size])}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded-full bg-thumb shadow-(--thumb-shadow) transition-transform duration-500 ease-spring"
        style={{
          width: `calc((100% - 0.25rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cx(
            'relative z-10 flex items-center justify-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-45',
            option.value === value ? 'text-fg' : 'text-fg-muted',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
