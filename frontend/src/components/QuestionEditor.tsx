import { ArrowUp } from 'lucide-react';
import { Button, Section } from './ui';

type Props = {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

const MAX_LENGTH = 20000; 

function handleEnter(e: React.KeyboardEvent<HTMLTextAreaElement>, onChange: (v: string) => void, submit: () => void) {
  if (e.key !== 'Enter' || e.nativeEvent.isComposing || e.shiftKey || e.altKey) return;
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end, value } = el;
    onChange(`${value.slice(0, start)}\n${value.slice(end)}`);
    requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
    return;
  }
  submit();
}

export function QuestionEditor({ title, value, onChange, onSubmit, disabled, placeholder, autoFocus }: Props) {
  const canSubmit = !disabled && value.trim().length > 0;
  const submit = () => canSubmit && onSubmit();

  return (
    <Section title={title}>
      <textarea
        autoFocus={autoFocus}
        aria-label={title}
        disabled={disabled}
        className="field min-h-28 resize-y"
        value={value}
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleEnter(e, onChange, submit)}
      />
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="hint">Enter - отправить · Shift + Enter - перенос</span>
        <Button variant="primary" disabled={!canSubmit} onClick={submit}>
          Ответить <ArrowUp className="size-4" strokeWidth={2.5} />
        </Button>
      </footer>
    </Section>
  );
}
