import type { ReactNode } from 'react';

type Option<T extends string> = { value: T; label: ReactNode; icon?: ReactNode };
type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({ value, options, onChange, disabled }: Props<T>) {
  return (
    <div className="segments" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button key={option.value} type="button" disabled={disabled}
          aria-pressed={option.value === value} onClick={() => onChange(option.value)} className="segment">
          {option.icon}{option.label}
        </button>
      ))}
    </div>
  );
}
