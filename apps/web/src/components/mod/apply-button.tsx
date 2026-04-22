'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nawhas/ui/components/button';
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
        <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>
      )}
      <Button
        type="button"
        onClick={handleApply}
        disabled={isPending}
        className="bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600"
      >
        {isPending ? 'Applying…' : 'Apply to database'}
      </Button>
    </div>
  );
}
