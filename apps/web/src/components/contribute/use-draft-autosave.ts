'use client';

import { useEffect, useRef, useState } from 'react';

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DraftEnvelope<T> {
  savedAt: number;
  value: T;
}

export interface DraftAutosaveAPI<T> {
  /** Existing draft loaded on mount, or null. */
  draft: T | null;
  /** How old the loaded draft is in ms, or null. */
  ageMs: number | null;
  /** Explicitly clear the stored draft (call on successful submit). */
  clear: () => void;
  /** Call to replace the stored value (typically from current form state). */
  save: (value: T) => void;
}

/**
 * Client-side draft persistence keyed by a stable identifier.
 * Serialises to localStorage on save; loads on mount; expires after 7 days.
 *
 * Intended usage: pass current form values on every change through `save`
 * (the hook debounces internally); on successful submit call `clear`; on
 * mount, if `draft` is non-null, prompt the user to restore.
 */
export function useDraftAutosave<T>(key: string): DraftAutosaveAPI<T> {
  const [draft, setDraft] = useState<T | null>(null);
  const [ageMs, setAgeMs] = useState<number | null>(null);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const env = JSON.parse(raw) as DraftEnvelope<T>;
      const age = Date.now() - env.savedAt;
      if (age > TTL_MS) {
        localStorage.removeItem(key);
        return;
      }
      setDraft(env.value);
      setAgeMs(age);
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  function save(value: T): void {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        const env: DraftEnvelope<T> = { savedAt: Date.now(), value };
        localStorage.setItem(key, JSON.stringify(env));
      } catch {
        // quota exceeded — silently drop; the user is warned via beforeunload
      }
    }, 500);
  }

  function clear(): void {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    localStorage.removeItem(key);
    setDraft(null);
    setAgeMs(null);
  }

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    [],
  );

  return { draft, ageMs, clear, save };
}
