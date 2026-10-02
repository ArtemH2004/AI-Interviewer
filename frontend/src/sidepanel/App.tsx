import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioLines, Keyboard, Mic, MonitorSpeaker, Settings2, TriangleAlert, Waves } from 'lucide-react';
import { generateAnswer, getHealth, transcribe, type Health } from '../lib/api';
import { AudioRecorder, RecorderError, type AudioSource } from '../lib/recorder';
import { applyTheme } from '../lib/theme';
import { DEFAULT_SETTINGS, HISTORY_LIMIT, useStoredState, type HistoryItem, type Settings } from '../lib/storage';
import { AnswerCard } from './components/AnswerCard';
import { HistoryList } from './components/HistoryList';
import { QuestionEditor } from './components/QuestionEditor';
import { RecordButton } from './components/RecordButton';
import { SegmentedControl } from './components/SegmentedControl';
import { SettingsSheet } from './components/SettingsSheet';
import { StatusPill } from './components/StatusPill';
import { Button, cx } from './components/ui';

type Mode = 'voice' | 'text';
type Phase = 'idle' | 'recording' | 'transcribing' | 'answering';
type ErrorState = { message: string; micPermission?: boolean };

const HEALTH_INTERVAL_MS = 15000;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function resolveLanguage(setting: Settings['language'], text: string, detected?: string) {
  if (setting !== 'auto') return setting;
  return detected ?? (/[а-яё]/i.test(text) ? 'ru' : 'en');
}

const SOURCE_HINTS: Record<AudioSource, string> = {
  mic: 'Записывается звук с микрофона: ваш голос или то, что звучит из колонок рядом.',
  tab: 'Записывается звук текущей вкладки браузера — голос интервьюера в Meet, Zoom, Teams. Ваш микрофон не пишется.',
  both: 'Микрофон и звук вкладки сводятся в одну запись: слышно и вас, и интервьюера.',
};

export function App() {
  const [settings, setSettings] = useStoredState<Settings>('settings', DEFAULT_SETTINGS);
  const [history, setHistory] = useStoredState<HistoryItem[]>('history', []);
  const [mode, setMode] = useStoredState<Mode>('mode', 'voice');

  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<string>();
  const [draft, setDraft] = useState('');
  const [asked, setAsked] = useState<{ text: string; language?: string } | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<ErrorState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const recorder = useRef<AudioRecorder>(null);
  const busy = phase !== 'idle';

  const updateSettings = (patch: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...patch }));

  // Статус backend: Whisper и Qwen
  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await getHealth(settings.apiBase));
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [settings.apiBase]);

  useEffect(() => {
    void refreshHealth();
    const id = setInterval(refreshHealth, HEALTH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshHealth]);

  useEffect(() => {
    if (phase !== 'recording') return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => () => recorder.current?.cancel(), []);

  useEffect(() => applyTheme(settings.theme), [settings.theme]);

  const ask = async (text: string, detected?: string) => {
    const question = text.trim();
    if (!question) return;
    const language = resolveLanguage(settings.language, question, detected);
    setAsked({ text: question, language: detected });
    setPhase('answering');
    setError(null);
    setAnswer('');
    try {
      const result = await generateAnswer(settings.apiBase, question, settings.context, language);
      setAnswer(result.answer);
      setHistory((prev) =>
        [{ id: crypto.randomUUID(), question, answer: result.answer, at: Date.now() }, ...prev].slice(0, HISTORY_LIMIT),
      );
    } catch (e) {
      setError({ message: (e as Error).message });
    } finally {
      setPhase('idle');
    }
  };

  const startRecording = async () => {
    setError(null);
    const instance = new AudioRecorder();
    try {
      await instance.start(settings.source, setLevel);
      recorder.current = instance;
      setPhase('recording');
    } catch (e) {
      setError({
        message: (e as Error).message,
        micPermission: e instanceof RecorderError && e.code === 'mic-permission',
      });
    }
  };

  const stopRecording = async () => {
    const audio = await recorder.current?.stop();
    recorder.current = null;
    setLevel(0);
    if (!audio || audio.size === 0) {
      setPhase('idle');
      setError({ message: 'Запись пустая. Попробуйте ещё раз.' });
      return;
    }
    setPhase('transcribing');
    try {
      const result = await transcribe(settings.apiBase, audio);
      if (!result.text.trim()) {
        setPhase('idle');
        setError({ message: 'Речь не распознана. Говорите ближе к микрофону или проверьте источник звука.' });
        return;
      }
      setTranscript(result.text);
      setDetectedLanguage(result.language);
      if (settings.autoAnswer) await ask(result.text, result.language);
      else setPhase('idle');
    } catch (e) {
      setPhase('idle');
      setError({ message: (e as Error).message });
    }
  };

  const recordingHint = {
    idle: transcript ? 'Нажмите, чтобы записать новый вопрос' : 'Нажмите и задайте вопрос голосом',
    recording: `Запись · ${formatTime(elapsed)}`,
    transcribing: 'Распознаю речь…',
    answering: 'Готовлю ответ…',
  }[phase];

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-4 pt-5 pb-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-title font-bold">AI-Interviewer</h1>
          <StatusPill health={health} offline={offline} />
        </div>
        <Button size="sm" iconOnly onClick={() => setSettingsOpen(true)} aria-label="Настройки">
          <Settings2 className="size-4" />
        </Button>
      </header>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        disabled={phase === 'recording' || phase === 'transcribing'}
        options={[
          { value: 'voice', label: 'Голос', icon: <AudioLines className="size-4" /> },
          { value: 'text', label: 'Текст', icon: <Keyboard className="size-4" /> },
        ]}
      />

      {mode === 'voice' ? (
        <>
          <section className="card flex flex-col items-center gap-3">
            <RecordButton
              recording={phase === 'recording'}
              disabled={phase === 'transcribing' || phase === 'answering'}
              level={level}
              onClick={phase === 'recording' ? stopRecording : startRecording}
            />
            <p className={cx('text-callout font-medium tabular-nums', phase === 'recording' ? 'text-ios-red' : 'text-fg-muted')}>
              {recordingHint}
            </p>
            <div className="flex w-full flex-col gap-2">
              <SegmentedControl<AudioSource>
                size="sm"
                value={settings.source}
                onChange={(source) => updateSettings({ source })}
                disabled={busy}
                options={[
                  { value: 'mic', label: 'Микрофон', icon: <Mic className="size-3.5" /> },
                  { value: 'tab', label: 'Вкладка', icon: <MonitorSpeaker className="size-3.5" /> },
                  { value: 'both', label: 'Оба', icon: <Waves className="size-3.5" /> },
                ]}
              />
              <p className="hint px-2 text-center">{SOURCE_HINTS[settings.source]}</p>
            </div>
          </section>

          {transcript && (
            <QuestionEditor
              title="Распознанный вопрос"
              value={transcript}
              onChange={setTranscript}
              onSubmit={() => ask(transcript, detectedLanguage)}
              disabled={busy}
            />
          )}
        </>
      ) : (
        <QuestionEditor
          autoFocus
          title="Вопрос"
          value={draft}
          onChange={setDraft}
          onSubmit={() => ask(draft)}
          disabled={busy}
          placeholder="Напишите вопрос интервьюера…"
        />
      )}

      {error && (
        <section className="card flex items-start gap-3" role="alert">
          <TriangleAlert className="size-4 shrink-0 translate-y-0.5 text-ios-orange" />
          <div className="flex flex-1 flex-col items-start gap-3 text-callout">
            <p>{error.message}</p>
            {error.micPermission && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('permission/index.html') })}
              >
                Выдать доступ
              </Button>
            )}
          </div>
        </section>
      )}

      {(phase === 'answering' || answer) && (
        <AnswerCard
          answer={answer}
          loading={phase === 'answering'}
          onRegenerate={() => asked && ask(asked.text, asked.language)}
        />
      )}

      <HistoryList
        items={history}
        onSelect={(item) => {
          setAsked({ text: item.question });
          setAnswer(item.answer);
          setError(null);
          if (mode === 'voice') setTranscript(item.question);
          else setDraft(item.question);
        }}
        onClear={() => setHistory([])}
      />

      <SettingsSheet
        open={settingsOpen}
        settings={settings}
        onChange={updateSettings}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
