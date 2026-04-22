'use client';

import { useState, useRef, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { updateDisplayName } from '@/server/actions/profile';

interface DisplayNameEditProps {
  initialName: string;
}

/**
 * Inline editable display name field.
 *
 * Shows the name as text; clicking the edit icon reveals an input field.
 * Submitting calls `profile.updateDisplayName` via Server Action with
 * optimistic update — reverts on error.
 */
export function DisplayNameEdit({ initialName }: DisplayNameEditProps): React.JSX.Element {
  const t = useTranslations('profile');
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleEditClick(): void {
    setDraft(name);
    setError(null);
    setEditing(true);
    // Focus handled via autoFocus on input
  }

  function handleCancel(): void {
    setEditing(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      return;
    }

    // Optimistic update
    const previous = name;
    setName(trimmed);
    setEditing(false);
    setError(null);

    startTransition(async () => {
      try {
        const updated = await updateDisplayName(trimmed);
        setName(updated.name);
      } catch (err) {
        // Revert on failure
        setName(previous);
        setEditing(true);
        setError(err instanceof Error ? err.message : t('failedToUpdateName'));
      }
    });
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={100}
          disabled={isPending}
          aria-label={t('displayNameLabel')}
          className="rounded-md border border-input bg-card px-2 py-1 text-lg font-semibold text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          aria-label={t('saveNameLabel')}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-700 dark:hover:bg-primary-400 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
        >
          {t('save')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          aria-label={t('cancelEditingLabel')}
          className="text-sm text-muted-foreground hover:text-foreground focus:outline-none focus:underline"
        >
          {t('cancel')}
        </button>
        {error && <p role="alert" className="text-xs text-error-600 dark:text-error-400">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-semibold text-foreground">{name}</span>
      <button
        type="button"
        onClick={handleEditClick}
        aria-label={t('editDisplayNameLabel')}
        className="rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      </button>
    </div>
  );
}
