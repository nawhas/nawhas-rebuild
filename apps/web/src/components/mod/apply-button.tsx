'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applySubmission } from '@/server/actions/moderation';
import { useState } from 'react';

interface ApplyButtonProps {
  submissionId: string;
}

/**
 * Apply an approved submission to the canonical tables.
 * Only shown for approved submissions.
 */
export function ApplyButton({ submissionId }: ApplyButtonProps): React.JSX.Element {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  function handleApply(): void {
    setError(null);
    startTransition(async () => {
      try {
        await applySubmission(submissionId);
        setApplied(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to apply submission.');
      }
    });
  }

  if (applied) {
    return (
      <span className="inline-flex items-center rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
        Applied successfully
      </span>
    );
  }

  return (
    <div className="mt-4">
      {error && (
        <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        type="button"
        onClick={handleApply}
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 disabled:opacity-50"
      >
        {isPending ? 'Applying…' : 'Apply to database'}
      </button>
    </div>
  );
}
