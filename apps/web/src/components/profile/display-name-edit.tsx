'use client';

import { useState, useRef, useTransition } from 'react';
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
        setError(err instanceof Error ? err.message : 'Failed to update name');
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
          aria-label="Display name"
          className="rounded-md border border-gray-300 px-2 py-1 text-lg font-semibold text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isPending || !draft.trim()}
          aria-label="Save name"
          className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="Cancel editing"
          className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
        >
          Cancel
        </button>
        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-semibold text-gray-900">{name}</span>
      <button
        type="button"
        onClick={handleEditClick}
        aria-label="Edit display name"
        className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
        </svg>
      </button>
    </div>
  );
}
