'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { setSubmissionModeratorNotes } from '@/server/actions/moderation';

interface Props {
  submissionId: string;
  initialNotes: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 600;

export function ModeratorNotes({ submissionId, initialNotes }: Props): React.JSX.Element {
  const t = useTranslations('mod.submission');
  const [value, setValue] = useState(initialNotes);
  const [state, setState] = useState<SaveState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialNotes);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  function scheduleSave(next: string): void {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (next === lastSavedRef.current) return;
      setState('saving');
      try {
        await setSubmissionModeratorNotes(submissionId, next);
        lastSavedRef.current = next;
        setState('saved');
      } catch {
        setState('error');
      }
    }, DEBOUNCE_MS);
  }

  return (
    <section className="mt-4 mb-6">
      <label htmlFor="mod-notes" className="mb-1 block text-[13px] font-medium text-[var(--text-dim)]">
        {t('moderatorNotesLabel')}
      </label>
      <p className="mb-2 text-xs text-[var(--text-faint)]">{t('moderatorNotesHint')}</p>
      <textarea
        id="mod-notes"
        rows={3}
        value={value}
        maxLength={2000}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          scheduleSave(next);
        }}
        placeholder={t('moderatorNotesPlaceholder')}
        className="w-full rounded-[8px] border border-[var(--border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
      />
      <p
        role="status"
        aria-live="polite"
        className="mt-1 h-4 text-xs text-[var(--text-faint)]"
      >
        {state === 'saving' && t('moderatorNotesSaving')}
        {state === 'saved' && t('moderatorNotesSaved')}
        {state === 'error' && (
          <span className="text-[var(--color-error-500)]">{t('moderatorNotesError')}</span>
        )}
      </p>
    </section>
  );
}
