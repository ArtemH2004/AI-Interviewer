import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'secondary' | 'primary' | 'danger';
  iconOnly?: boolean;
};

export function Button({ variant = 'secondary', iconOnly, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary',
        iconOnly && 'btn-icon',
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

export function SectionHeader({ title, icon, actions, className }: SectionHeaderProps) {
  return (
    <header className={cx('mb-3 flex min-h-9 items-center justify-between gap-3 pl-2', className)}>
      <h2 className="inline-flex min-w-0 items-center gap-2 text-base font-semibold leading-snug text-fg">
        {icon}
        {title}
      </h2>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

type SectionProps = SectionHeaderProps & {
  children: ReactNode;
};

export function Section({ title, icon, actions, className, children }: SectionProps) {
  return (
    <section className={cx('card', className)}>
      <SectionHeader title={title} icon={icon} actions={actions} />
      {children}
    </section>
  );
}

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
