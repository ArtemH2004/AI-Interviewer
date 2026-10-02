// Базовые UI-примитивы. Стили живут в styles.css (btn, card, label, field…),
// здесь только сборка классов и разметки, чтобы не дублировать её по компонентам.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'glass' | 'primary';
  size?: 'sm' | 'md';
  /** Круглая кнопка только с иконкой (нужен aria-label или title) */
  iconOnly?: boolean;
};

// Полные имена классов: Tailwind не находит собранные из шаблона строки
const BUTTON_SIZES = {
  sm: { text: 'btn-sm', icon: 'btn-icon-sm' },
  md: { text: 'btn-md', icon: 'btn-icon-md' },
};

export function Button({ variant = 'glass', size = 'md', iconOnly, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        variant === 'primary' ? 'btn-primary' : 'btn-glass',
        BUTTON_SIZES[size][iconOnly ? 'icon' : 'text'],
        className,
      )}
      {...props}
    />
  );
}

type SectionHeaderProps = {
  title: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

// Заголовок секции/карточки: подпись слева, действия справа, одна высота (32px)
export function SectionHeader({ title, icon, actions, className }: SectionHeaderProps) {
  return (
    <header className={cx('mb-2 flex min-h-8 items-center justify-between gap-2', className)}>
      <span className="label inline-flex items-center gap-1.5">
        {icon}
        {title}
      </span>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

// Подпись + элемент управления (для форм)
export function FormField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

type ToggleProps = {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// iOS-переключатель
export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-body">
        {label}
        {description && <span className="hint block">{description}</span>}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden />
    </label>
  );
}
