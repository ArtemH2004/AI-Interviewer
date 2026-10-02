import { useCallback, useEffect, useState } from 'react';
import type { AudioSource } from './recorder';
import type { Theme } from './theme';

export type Settings = {
  apiBase: string;
  language: 'auto' | 'ru' | 'en';
  context: string;
  source: AudioSource;
  autoAnswer: boolean;
  theme: Theme;
};

export type HistoryItem = {
  id: string;
  question: string;
  answer: string;
  at: number;
};

export const DEFAULT_SETTINGS: Settings = {
  apiBase: 'http://localhost:8000',
  language: 'auto',
  context: '',
  source: 'mic',
  autoAnswer: true,
  theme: 'light',
};

export const HISTORY_LIMIT = 20;

// Состояние, синхронизированное с chrome.storage.local
export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(key).then((items) => {
      const stored = items[key] as T | undefined;
      if (stored !== undefined) {
        setValue(
          typeof initial === 'object' && !Array.isArray(initial) ? { ...initial, ...stored } : stored,
        );
      }
      setLoaded(true);
    });
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        void chrome.storage.local.set({ [key]: resolved });
        return resolved;
      });
    },
    [key],
  );

  return [value, update, loaded] as const;
}
