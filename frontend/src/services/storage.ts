import { useCallback, useEffect, useState } from 'react';
import type { AudioSource } from './recorder';
import type { Theme } from './theme';

export type Settings = {
  apiBase: string;
  language: 'auto' | 'ru' | 'en';
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
  source: 'mic',
  autoAnswer: true,
  theme: 'light',
};

export const HISTORY_LIMIT = 20;

export function useStoredState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(key).then(async (items) => {
      let stored = items[key] as T | undefined;
      if (key === 'settings' && stored && typeof stored === 'object' && 'context' in stored) {
        const cleaned = { ...stored };
        Reflect.deleteProperty(cleaned, 'context');
        stored = cleaned;
        await chrome.storage.local.set({ [key]: cleaned });
      }
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
