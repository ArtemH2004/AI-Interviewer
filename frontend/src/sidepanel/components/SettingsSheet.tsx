import { Moon, Sun, SunMoon, X } from 'lucide-react';
import type { Settings } from '../../lib/storage';
import { SegmentedControl } from './SegmentedControl';
import { Button, FormField, Toggle, cx } from './ui';

type Props = {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
};

// Нижний «лист» в стиле iOS
export function SettingsSheet({ open, settings, onChange, onClose }: Props) {
  return (
    <div className={cx('fixed inset-0 z-50', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cx('absolute inset-0 bg-scrim transition-opacity duration-300', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Настройки"
        className={cx(
          'glass-thick absolute! inset-x-2 bottom-2 max-h-[88vh] overflow-y-auto rounded-sheet p-5 transition-transform duration-500 ease-spring',
          open ? 'translate-y-0' : 'translate-y-[110%]',
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-fg-muted opacity-40" />
        <header className="mb-5 flex items-center justify-between">
          <h2 className="text-headline font-semibold">Настройки</h2>
          <Button size="sm" iconOnly onClick={onClose} aria-label="Закрыть">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex flex-col gap-5">
          <FormField label="Адрес backend">
            <input
              className="field"
              value={settings.apiBase}
              onChange={(e) => onChange({ apiBase: e.target.value.trim() })}
              placeholder="http://localhost:8000"
              spellCheck={false}
            />
          </FormField>

          <FormField label="Тема">
            <SegmentedControl
              size="sm"
              value={settings.theme}
              onChange={(theme) => onChange({ theme })}
              options={[
                { value: 'light', label: 'Светлая', icon: <Sun className="size-3.5" /> },
                { value: 'dark', label: 'Тёмная', icon: <Moon className="size-3.5" /> },
                { value: 'system', label: 'Авто', icon: <SunMoon className="size-3.5" /> },
              ]}
            />
          </FormField>

          <FormField label="Язык ответа">
            <SegmentedControl
              size="sm"
              value={settings.language}
              onChange={(language) => onChange({ language })}
              options={[
                { value: 'auto', label: 'Как в вопросе' },
                { value: 'ru', label: 'Русский' },
                { value: 'en', label: 'English' },
              ]}
            />
          </FormField>

          <Toggle
            label="Отвечать сразу после распознавания"
            description="Иначе можно сначала поправить текст"
            checked={settings.autoAnswer}
            onChange={(autoAnswer) => onChange({ autoAnswer })}
          />

          <FormField label="О себе (контекст для ответов)">
            <textarea
              className="field min-h-28 resize-y"
              value={settings.context}
              maxLength={20000}
              onChange={(e) => onChange({ context: e.target.value })}
              placeholder="Стек, опыт, проекты — Qwen будет опираться на это и не станет выдумывать факты"
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}
