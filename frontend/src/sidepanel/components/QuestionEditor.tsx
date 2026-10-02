import { ArrowUp } from 'lucide-react';
import { Button, SectionHeader } from './ui';

type Props = {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
};

const MAX_LENGTH = 20000; // как в backend (QuestionRequest.text)

// Enter — отправить, Ctrl + Enter (и Shift + Enter) — перенос строки
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

// Карточка с вопросом: и для ручного ввода, и для правки распознанного текста
export function QuestionEditor({ title, value, onChange, onSubmit, disabled, placeholder, autoFocus }: Props) {
  const canSubmit = !disabled && value.trim().length > 0;
  const submit = () => canSubmit && onSubmit();

  return (
    <section className="card">
      <SectionHeader title={title} />
      <textarea
        autoFocus={autoFocus}
        className="field min-h-28 resize-y"
        value={value}
        maxLength={MAX_LENGTH}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleEnter(e, onChange, submit)}
      />
      <footer className="mt-3 flex items-center justify-between gap-3">
        <span className="hint">Enter — отправить · Ctrl + Enter — новая строка</span>
        <Button variant="primary" disabled={!canSubmit} onClick={submit}>
          Ответить <ArrowUp className="size-4" strokeWidth={2.5} />
        </Button>
      </footer>
    </section>
  );
}
