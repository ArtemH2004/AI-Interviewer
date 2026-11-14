import { Moon, Sun, SunMoon, X } from 'lucide-react';
import type { Settings } from '../services/storage';
import { SegmentedControl } from './SegmentedControl';
import { Button, FormField, SectionHeader, Toggle } from './ui';

type Props = {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onClose: () => void;
};

export function SettingsDialog({ open, settings, onChange, onClose }: Props) {
  return (
    <div className="settings-overlay" data-open={open} aria-hidden={!open} inert={!open}>
      <div
        className="settings-backdrop"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки"
        className="card settings-sheet"
      >
        <SectionHeader title="Настройки" className="mb-4" actions={
          <Button iconOnly onClick={onClose} aria-label="Закрыть">
            <X className="size-4" />
          </Button>
        } />

        <div className="flex flex-col gap-4">
          <FormField label="Тема">
            <SegmentedControl
              value={settings.theme}
              onChange={(theme) => onChange({ theme })}
              options={[
                { value: 'light', label: 'Светлая', icon: <Sun className="size-4" /> },
                { value: 'dark', label: 'Тёмная', icon: <Moon className="size-4" /> },
                { value: 'system', label: 'Авто', icon: <SunMoon className="size-4" /> },
              ]}
            />
          </FormField>

          <FormField label="Язык ответа">
            <SegmentedControl
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

        </div>
      </div>
    </div>
  );
}
